import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Settings, Save } from 'lucide-react';

export function SettingsPage() {
  const [jwtSecret, setJwtSecret] = useState('********************'); // Mocked for display
  const [frontendUrl, setFrontendUrl] = useState('http://localhost:5173');
  const [maxFileSize, setMaxFileSize] = useState('5'); // in MB
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveMessage('');
    // In a real application, you would send these settings to a backend API
    // For this prototype, we'll just simulate a save.
    console.log('Saving settings:', { jwtSecret, frontendUrl, maxFileSize });
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
    setSaveMessage('Settings saved successfully!');
    setIsSaving(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure global application parameters.</p>
        </div>
      </div>

      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">General Settings</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <Input
            label="JWT Secret (Backend)"
            type="password"
            value={jwtSecret}
            onChange={(e) => setJwtSecret(e.target.value)}
            disabled
            fullWidth
            description="Highly sensitive. Not directly editable from UI."
          />
          <Input
            label="Frontend URL (CORS)"
            type="text"
            value={frontendUrl}
            onChange={(e) => setFrontendUrl(e.target.value)}
            fullWidth
            description="Used by backend for CORS configuration."
          />
          <Input
            label="Max File Size for Uploads (MB)"
            type="number"
            value={maxFileSize}
            onChange={(e) => setMaxFileSize(e.target.value)}
            fullWidth
            description="Maximum size for student face images."
          />
          {/* Add more settings as needed */}
        </div>
        {saveMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-6 text-center">
            <p className="text-green-600 text-sm">{saveMessage}</p>
          </div>
        )}
        <Button onClick={handleSaveChanges} isLoading={isSaving} fullWidth className="mt-6">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Card>

      <Card variant="elevated" padding="lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Face Recognition Settings</h3>
        <p className="text-gray-600">These settings would control the behavior of the ML model.</p>
        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <Input
            label="Recognition Confidence Threshold (%)"
            type="number"
            value="80"
            onChange={() => {}}
            disabled
            fullWidth
            description="Minimum confidence for automatic attendance marking."
          />
          <Input
            label="Attendance Capture Interval (seconds)"
            type="number"
            value="3"
            onChange={() => {}}
            disabled
            fullWidth
            description="Frequency of image capture in live attendance mode."
          />
          {/* More ML-specific settings */}
        </div>
      </Card>
    </div>
  );
}
