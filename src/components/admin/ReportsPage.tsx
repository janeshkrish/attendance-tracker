import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BarChart3, Download } from 'lucide-react';
import apiService from '../../services/api';

export function ReportsPage() {
  const [reportType, setReportType] = useState('attendance');
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState<any>(null);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiService.generateReport(reportType, filters);
      setReportData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExportReport = async () => {
      // Logic to export the generated reportData
      alert("Export functionality to be implemented.");
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">System Reports</h1>
      
      <Card variant="elevated" padding="lg">
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <Input label="Report Type" as="select" value={reportType} onChange={(e: any) => setReportType(e.target.value)}>
            <option value="attendance">Attendance</option>
            <option value="student-performance">Student Performance</option>
          </Input>
          <Input label="Start Date" type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
          <Input label="End Date" type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
        </div>
        <Button onClick={handleGenerateReport} isLoading={isLoading}><BarChart3 className="mr-2"/>Generate</Button>
      </Card>
      
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
      
      {reportData && (
        <Card variant="elevated" padding="lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Report Results</h3>
            <Button variant="outline" onClick={handleExportReport}><Download className="mr-2"/>Export</Button>
          </div>
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
            {JSON.stringify(reportData, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
