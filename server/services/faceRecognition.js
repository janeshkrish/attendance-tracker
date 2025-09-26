const fs = require('fs');
const path = require('path');
const Student = require('../models/Student');

class FaceRecognitionService {
  constructor() {
    this.faceDescriptors = new Map();
    this.loadFaceDescriptors();
  }

  // Load face descriptors from database
  async loadFaceDescriptors() {
    try {
      const students = await Student.find({ 
        isActive: true,
        'faceEncodings.0': { $exists: true }
      });

      students.forEach(student => {
        if (student.faceEncodings && student.faceEncodings.length > 0) {
          this.faceDescriptors.set(student._id.toString(), {
            studentId: student._id,
            name: student.name,
            studentIdNumber: student.studentId,
            encodings: student.faceEncodings.map(fe => fe.encoding)
          });
        }
      });

      console.log(`Loaded face descriptors for ${this.faceDescriptors.size} students`);
    } catch (error) {
      console.error('Error loading face descriptors:', error);
    }
  }

  // Generate face encoding from image (simulated)
  async generateFaceEncoding(imageBuffer) {
    try {
      // In a real implementation, you would use a face recognition library
      // like face-api.js, OpenCV, or call a Python service
      // For now, we'll generate a random encoding for demonstration
      const encoding = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
      return encoding;
    } catch (error) {
      console.error('Error generating face encoding:', error);
      throw new Error('Failed to generate face encoding');
    }
  }

  // Compare face encodings
  compareFaces(encoding1, encoding2, threshold = 0.6) {
    if (!encoding1 || !encoding2 || encoding1.length !== encoding2.length) {
      return 0;
    }

    // Calculate Euclidean distance
    let distance = 0;
    for (let i = 0; i < encoding1.length; i++) {
      distance += Math.pow(encoding1[i] - encoding2[i], 2);
    }
    distance = Math.sqrt(distance);

    // Convert distance to confidence (0-1)
    const confidence = Math.max(0, 1 - (distance / 2));
    return confidence;
  }

  // Recognize face from image
  async recognizeFace(imageData, courseId) {
    try {
      // Convert base64 to buffer
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Generate encoding for the input image
      const inputEncoding = await this.generateFaceEncoding(imageBuffer);

      // Get enrolled students for the course
      const Course = require('../models/Course');
      const course = await Course.findById(courseId).populate('enrolledStudents');
      
      if (!course || !course.enrolledStudents) {
        return [];
      }

      const enrolledStudentIds = course.enrolledStudents.map(s => s._id.toString());
      const results = [];

      // Compare with enrolled students only
      for (const [studentId, studentData] of this.faceDescriptors.entries()) {
        if (!enrolledStudentIds.includes(studentId)) {
          continue;
        }

        let bestConfidence = 0;
        
        // Compare with all encodings for this student
        for (const encoding of studentData.encodings) {
          const confidence = this.compareFaces(inputEncoding, encoding);
          bestConfidence = Math.max(bestConfidence, confidence);
        }

        // If confidence is above threshold, add to results
        if (bestConfidence > 0.7) {
          results.push({
            studentId: studentData.studentId,
            name: studentData.name,
            studentIdNumber: studentData.studentIdNumber,
            confidence: bestConfidence
          });
        }
      }

      // Sort by confidence (highest first)
      results.sort((a, b) => b.confidence - a.confidence);

      // Return top 3 matches
      return results.slice(0, 3);
    } catch (error) {
      console.error('Face recognition error:', error);
      throw new Error('Face recognition failed');
    }
  }

  // Add new face encoding for a student
  async addFaceEncoding(studentId, imageBuffer) {
    try {
      const encoding = await this.generateFaceEncoding(imageBuffer);
      
      // Update database
      const student = await Student.findById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      const faceData = {
        encoding: encoding,
        imageUrl: `/uploads/students/${studentId}-${Date.now()}.jpg`,
        capturedAt: new Date()
      };

      student.faceEncodings.push(faceData);
      await student.save();

      // Update in-memory descriptors
      if (this.faceDescriptors.has(studentId)) {
        this.faceDescriptors.get(studentId).encodings.push(encoding);
      } else {
        this.faceDescriptors.set(studentId, {
          studentId: student._id,
          name: student.name,
          studentIdNumber: student.studentId,
          encodings: [encoding]
        });
      }

      return faceData;
    } catch (error) {
      console.error('Error adding face encoding:', error);
      throw error;
    }
  }

  // Reload face descriptors (call when students are updated)
  async reloadFaceDescriptors() {
    this.faceDescriptors.clear();
    await this.loadFaceDescriptors();
  }
}

module.exports = new FaceRecognitionService();