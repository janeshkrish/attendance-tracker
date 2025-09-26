import React, { useState } from 'react';
import { User, Mail, BookOpen, Save, Camera, Smartphone, ArrowLeft, Check } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { CameraCapture } from '../attendance/CameraCapture';
import apiService from '../../services/api';

interface StudentRegistrationProps {
  onNavigate: (page: string) => void;
}

export function StudentRegistration({ onNavigate }: StudentRegistrationProps) {
  const [step, setStep] = useState(1);
  const [studentData, setStudentData] = useState({
    studentId: '',
    name: '',
    email: '',
    course: '',
    department: '',
    semester: '',
    phoneNumber: '',
    username: '',
    password: 'studentpassword', // Default password
  });
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setStudentData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleImageCapture = (imageData: string) => {
    if (capturedImages.length < 10) {
      setCapturedImages(prev => [...prev, imageData]);
      setError(''); // Clear any previous errors
    }
  };

  const handleNext = () => {
    if (step === 1) {
      const requiredFields: (keyof typeof studentData)[] = ['studentId', 'name', 'email', 'course', 'department', 'semester', 'phoneNumber'];
      if (requiredFields.some(field => !studentData[field])) {
        setError('Please fill in all personal information fields.');
        return;
      }
    }
    if (step === 2 && capturedImages.length < 5) {
      setError('Please capture at least 5 face images for accurate recognition.');
      return;
    }
    setError('');
    if (step < 3) setStep(step + 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const studentResponse = await apiService.createStudent({
        ...studentData,
        username: studentData.username || studentData.studentId, // Default username to studentId
      });
      const newStudentId = studentResponse.student._id;

      if (capturedImages.length > 0) {
        const imageFiles: Blob[] = capturedImages.map(base64Image => {
          const byteString = atob(base64Image.split(',')[1]);
          const mimeString = base64Image.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          return new Blob([ab], { type: mimeString });
        });
        await apiService.uploadFaceImages(newStudentId, imageFiles);
      }
      setSuccessMessage('Student registered successfully! Redirecting to student management...');
      setTimeout(() => onNavigate('students'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to register student.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Student Registration</h1>
        <p className="text-gray-600 mt-2">Register new student with face recognition data</p>
      </div>
      
      {/* Progress Steps */}
      <div className="flex justify-center my-4">
        {/* ... progress steps UI ... */}
      </div>

      {error && <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-md text-center">{error}</div>}
      {successMessage && <div className="bg-green-100 border border-green-300 text-green-700 p-3 rounded-md text-center">{successMessage}</div>}

      {/* Step Content */}
      <Card variant="elevated" padding="lg">
        {step === 1 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Step 1: Personal Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
                <Input label="Student ID" value={studentData.studentId} onChange={e => handleInputChange('studentId', e.target.value)} icon={<User />} required />
                <Input label="Full Name" value={studentData.name} onChange={e => handleInputChange('name', e.target.value)} icon={<User />} required />
                <Input label="Email Address" type="email" value={studentData.email} onChange={e => handleInputChange('email', e.target.value)} icon={<Mail />} required />
                <Input label="Phone Number" value={studentData.phoneNumber} onChange={e => handleInputChange('phoneNumber', e.target.value)} icon={<Smartphone />} required />
                <Input label="Course/Program" value={studentData.course} onChange={e => handleInputChange('course', e.target.value)} icon={<BookOpen />} required />
                <Input label="Department" value={studentData.department} onChange={e => handleInputChange('department', e.target.value)} required />
                <Input label="Semester" value={studentData.semester} onChange={e => handleInputChange('semester', e.target.value)} required />
                <Input label="Username (optional)" value={studentData.username} onChange={e => handleInputChange('username', e.target.value)} icon={<User />} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
             <h3 className="text-xl font-semibold text-gray-900 mb-2">Step 2: Face Registration</h3>
             <p className="text-gray-600 mb-4">Position your face in the center of the frame and capture multiple images.</p>
             <CameraCapture 
               mode="registration" 
               isActive={isCameraActive || step === 2} 
               onCapture={handleImageCapture} 
             />
             {capturedImages.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-semibold text-gray-800">Captured Images: {capturedImages.length}/10</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {capturedImages.map((img, i) => (
                          <img 
                            key={i} 
                            src={img} 
                            alt={`Captured face ${i + 1}`}
                            className="w-20 h-20 object-cover rounded-md border-2 border-green-500" 
                          />
                        ))}
                    </div>
                </div>
             )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Step 3: Review & Confirm</h3>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><strong>Student ID:</strong> {studentData.studentId}</div>
                <div><strong>Name:</strong> {studentData.name}</div>
                <div><strong>Email:</strong> {studentData.email}</div>
                <div><strong>Course:</strong> {studentData.course}</div>
                <div><strong>Department:</strong> {studentData.department}</div>
                <div><strong>Face Images:</strong> {capturedImages.length} captured</div>
              </div>
            </div>
            <p className="text-center text-gray-700">Please confirm all details are correct before submission.</p>
          </div>
        )}
        
        {/* Navigation */}
        <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1 || isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            {step < 3 ? (
                <Button onClick={handleNext} disabled={isLoading}>
                    Next Step
                </Button>
            ) : (
                <Button onClick={handleSubmit} isLoading={isLoading} disabled={isLoading}>
                   <Check className="mr-2 h-4 w-4" /> Register Student
                </Button>
            )}
        </div>
      </Card>
    </div>
  );
}

