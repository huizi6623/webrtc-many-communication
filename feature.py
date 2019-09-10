#!/usr/bin/python
# -*- coding: utf-8 -*-

import sys
import cv2 as cv

imgobj = cv.imread(sys.argv[1])
cv2.namedWindow("image") #创建窗口并显示的是图像类型
cv2.imshow("image",imgobj)
cv2.waitKey(0)        #等待事件触发，参数0表示永久等待
cv2.destroyAllWindows()   #释放窗口
print('cv:' + str(cv, 'utf-8'))