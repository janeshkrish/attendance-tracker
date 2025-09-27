import cv2

class AntiSpoof:
    def __init__(self):
        self.prev_gray = None

    def motion_ok(self, frame_bgr):
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        if self.prev_gray is None:
            self.prev_gray = gray
            return True
        diff = cv2.absdiff(gray, self.prev_gray)
        self.prev_gray = gray
        return diff.mean() > 1.2

    def texture_ok(self, frame_bgr):
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        lap = cv2.Laplacian(gray, cv2.CV_64F).var()
        return lap > 10.0

    def is_live(self, frame_bgr):
        return self.motion_ok(frame_bgr) and self.texture_ok(frame_bgr)