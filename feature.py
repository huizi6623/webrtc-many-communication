#!/usr/bin/python
# -*- coding: utf-8 -*-

import sys
import cv2 as cv

img = cv.imread(sys.argv[1])
orb = cv.ORB_create()
kp, des = orb.detectAndCompute(img, None)
print('keyPoints')
for key in kp:
    print(key.pt)
print('cols')
print(des.shape[1])
print('rows')
print(des.shape[0])
print('descriptors')
for key in des:
    print(key)
