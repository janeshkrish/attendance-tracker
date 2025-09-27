import numpy as np
from recognition.encoders import Encoder
from recognition.anti_spoof import AntiSpoof
from models import StudentModel
from config import MIN_CONFIDENCE

class Recognizer:
    def __init__(self):
        self.encoder = Encoder()
        self.spoof = AntiSpoof()
        self.known_encodings = []
        self.known_ids = []
        self.reload()

    def reload(self):
        self.known_encodings.clear()
        self.known_ids.clear()
        for stu in StudentModel.active_with_encodings():
            sid = str(stu["_id"])
            for fe in stu.get("face_encodings", []):
                self.known_encodings.append(np.array(fe["encoding"], dtype=np.float32))
                self.known_ids.append(sid)

    def add_encoding_for_student(self, student_obj_id: str, frame_bgr):
        boxes, encs = self.encoder.encode(frame_bgr)
        if not encs:
            raise ValueError("No face found")
        enc = encs
        self.known_encodings.append(enc)
        self.known_ids.append(student_obj_id)
        return enc

    def recognize_b64(self, image_bgr):
        if not self.spoof.is_live(image_bgr):
            return []
        boxes, encs = self.encoder.encode(image_bgr)
        results = []
        for enc, box in zip(encs, boxes):
            matches, dists = self.encoder.compare(self.known_encodings, enc)
            if len(dists) == 0:
                continue
            best = int(np.argmin(dists))
            if matches[best]:
                conf = 1.0 - float(dists[best])
                if conf >= MIN_CONFIDENCE:
                    results.append((self.known_ids[best], conf, box))
        return results