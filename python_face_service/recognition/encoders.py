import numpy as np
import face_recognition
from config import FACE_COMPARE_TOLERANCE

class Encoder:
    def encode(self, image_bgr):
        rgb = image_bgr[:, :, ::-1]
        boxes = face_recognition.face_locations(rgb)
        encs = face_recognition.face_encodings(rgb, boxes)
        return boxes, encs

    def compare(self, known_encodings, encoding):
        if not known_encodings:
            return [], []
        matches = face_recognition.compare_faces(known_encodings, encoding, tolerance=FACE_COMPARE_TOLERANCE)
        distances = face_recognition.face_distance(known_encodings, encoding)
        return matches, distances
