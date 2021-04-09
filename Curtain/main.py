import pymysql
import time
import sys
import threading

import numpy as np
"""
각 조명에 대한 평균값 구하기 (알고리즘 설계)
"""

# 5초 마다
# 5분간 데이터 평균

conn = pymysql.connect(host='localhost', user='root', port=3306,
                    password='0000', db='curtain', charset='utf8')
cursor = conn.cursor()

sql = "SELECT * FROM brightness"


cursor.execute(sql)
res = cursor.fetchall()
conn.commit()
conn.close()

inside = [data[1] for data in res]
outside = [data[2] for data in res]

in_average = np.array(inside).mean()
out_average = np.array(outside).mean()

lux_standard = [0, 100, 200, 300, 400, 500]

class AverageLight():
    def __init__(self):
        self.inside_light = in_average
        self.outside_light = out_average
        self.hope_list = luxstandard[sys.argv[1]]
    

    def control_function(self):
        print(f"linear average --> {self.inside_light}")
        print(f"outline average --> {self.outside_light}")

        if self.inside_light < self.outside_light:
            if self.inside_light == self.hope_list:
                print("LED|0.999")
            else:
                print("LED trun off!")
        else:
            if self.inside_light == self.hope_list:
                print("OK")
            elif self.hope_list > self.inside_light:
                print("curtain up")
            else:
                print("curtain down")


AverageLight().control_function()