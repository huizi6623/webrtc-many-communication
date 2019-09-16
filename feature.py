#!/usr/bin/python
# -*- coding: utf-8 -*-

import sys
import cv2 as cv

print(sys.argv[1])
img = cv.imread(sys.argv[1])
orb = cv.ORB_create()
kp, des = orb.detectAndCompute(img, None)
print(kp)
print(des)