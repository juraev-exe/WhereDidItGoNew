/**
 * "Ask your finances" chat — opt-in, BYOK. Calls the Anthropic API directly
 * from the client with the user's own key; nothing passes through a backend
 * because this app doesn't have one (local-first, no server).
 */
import type Anthropic from '@anthropic-ai/sdk'
import { monthKey } from '@/lib/dates'
import { spendByCategory, summarizeMonth } from '@/services/stats'
import type { Account, Budget, Category, Transaction } from '@/types/finance'

const MODEL = 'claude-opus-5'

export interface AiChatMessage {
  role: 'user' | 'assistant'
  text: string
}

export type AiChatErrorKind = 'auth' | 'rateLimit' | 'generic'

export class AiChatError extends Error {
  kind: AiChatErrorKind
  constructor(kind: AiChatErrorKind) {
    super(`AiChatError: ${kind}`)
    this.kind = kind
  }
}

export interface FinanceContextData {
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  accounts: Account[]
  currency: string
}

function major(amountMinorUnits: number): string {
  return (amountMinorUnits / 100).toFixed(2)
}

function buildFinanceContext(data: FinanceContextData): string {
  const month = monthKey()
  const summary = summarizeMonth(data.transactions, data.budgets, month)
  const byCat = spendByCategory(data.transactions, data.categories, month).slice(0, 8)
  const recent = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15)
  const catName = Object.fromEntries(data.categories.map((c) => [c.id, c.name]))

  const lines: string[] = [
    `Currency: ${data.currency}. All amounts below are in major units (e.g. dollars, not cents).`,
    `This month (${month}): income ${major(summary.income)}, expenses ${major(summary.expense)}, net ${major(summary.net)}.`,
  ]
  if (byCat.length) {
    lines.push('Top spending categories this month:')
    lines.push(...byCat.map((c) => `- ${c.name}: ${major(c.amount)} (${c.percent.toFixed(0)}%)`))
  }
  if (data.accounts.length) {
    lines.push('Accounts:')
    lines.push(...data.accounts.filter((a) => !a.archived).map((a) => `- ${a.name} (${a.type}): balance ${major(a.balance)}`))
  }
  if (recent.length) {
    lines.push('Recent transactions (date, type, amount, category, note):')
    lines.push(
      ...recent.map((t) => {
        const cat = t.categoryId ? catName[t.categoryId] ?? '' : ''
        return `- ${t.date.slice(0, 10)} ${t.type} ${major(t.amount)} ${cat} ${t.note}`.trim()
      }),
    )
  }
  return lines.join('\n')
}

/**
 * Loads the Anthropic SDK on demand rather than as a static import — it's a
 * sizeable dependency and most sessions never open the AI sheet, so every
 * other screen (Insights included) shouldn't pay to parse it upfront.
 */
export async function askFinanceQuestion(apiKey: string, question: string, data: FinanceContextData): Promise<string> {
  const { default: AnthropicCtor } = await import('@anthropic-ai/sdk')
  const client = new AnthropicCtor({ apiKey, dangerouslyAllowBrowser: true })
  const context = buildFinanceContext(data)
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system:
        'You are a concise personal-finance assistant inside the WhereDidItGo app. ' +
        'Answer using only the financial data provided below — never invent numbers. ' +
        'Keep answers short and actionable.\n\n' + context,
      messages: [{ role: 'user', content: question }],
    })
    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')
    return textBlock?.text ?? ''
  } catch (e) {
    if (e instanceof AnthropicCtor.AuthenticationError) throw new AiChatError('auth')
    if (e instanceof AnthropicCtor.RateLimitError) throw new AiChatError('rateLimit')
    throw new AiChatError('generic')
  }
}
