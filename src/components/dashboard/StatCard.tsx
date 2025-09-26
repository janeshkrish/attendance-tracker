import React from 'react';
import { Card } from '../ui/Card';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  color = 'from-blue-500 to-purple-600'
}: StatCardProps) {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <Card variant="elevated" padding="lg" className="group hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={clsx('text-sm mt-1', changeColors[changeType])}>
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-gradient-to-r ${color} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );
}