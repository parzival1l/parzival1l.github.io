import { getComparison } from '@/lib/comparisons'
import { ComparisonTable } from '@/components/comparison-table'

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

/**
 * MDX entry point: `<ModelComparison task="explain-local-diff" />`.
 * Runs on the server and loads content/comparisons/<task>.yaml. The prompt
 * and criteria render as ordinary post text (static HTML, styled by the
 * prose column); only the table below them hydrates. The list numbers match
 * the numbered chips on each model's scorecard.
 */
export function ModelComparison({ task }: { task: string }) {
  const comparison = getComparison(task)
  const { criteria } = comparison
  const count = NUMBER_WORDS[criteria.length] ?? String(criteria.length)

  return (
    <>
      <p>I asked the agent: &ldquo;{comparison.prompt}&rdquo;</p>
      <p>
        I judged every answer on {count} things. The numbers match the
        scorecard below.
      </p>
      <ol>
        {criteria.map(c => (
          <li key={c.id}>
            {c.label}: {lowerFirst(c.detail)}
          </li>
        ))}
      </ol>
      <ComparisonTable comparison={comparison} />
    </>
  )
}
