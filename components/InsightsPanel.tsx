import { Insight } from '@/types';
import { Card } from './Card';

interface InsightsPanelProps {
  insights: Insight[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-3">
      {insights.map((insight, index) => (
        <Card
          key={index}
          className={`${
            insight.type === 'danger'
              ? 'bg-red-50 border-red-200'
              : insight.type === 'warning'
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-green-50 border-green-200'
          } border`}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">{insight.type === 'danger' ? '🚨' : insight.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <p className={`text-sm ${
              insight.type === 'danger'
                ? 'text-red-800'
                : insight.type === 'warning'
                ? 'text-yellow-800'
                : 'text-green-800'
            }`}>
              {insight.message}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}