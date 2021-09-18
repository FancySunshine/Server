import pymysql
import time
import sys
import threading
import json
import numpy as np
"""
각 조명에 대한 평균값 구하기 (알고리즘 설계)
"""

# 5초 마다
# 5분간 데이터 평균

conn = pymysql.connect(host='localhost', user='root', port=3306,
                       password='0000', db='curtain', charset='utf8')
cursor = conn.cursor()

#sql = "SELECT * FROM brightness order by `time` desc limit 60"
sql = "SELECT * FROM brightness order by `time` desc limit 10"

cursor.execute(sql)
res = cursor.fetchall()
conn.commit()
conn.close()

inside = [data[1] for data in res]
outside = [data[2] for data in res]

in_average = np.array(inside).mean()
out_average = np.array(outside).mean()
#print('in_average from DB : ', in_average)
#print('out_average from DB : ', out_average)
lux_standard = [0, 100, 200, 300, 400, 500]


class AverageLight():
    def __init__(self):
        self.inside_light = in_average
        self.outside_light = out_average
        self.hope_light = lux_standard[int(sys.argv[1])]

    def control_function(self):
        #print(f"linear average --> {self.inside_light}")
        #print(f"outline average --> {self.outside_light}")
        self.hope_light = 300
        self.outside_light = 100
        self.inside_light = 200
        if self.inside_light < self.outside_light:
            if self.inside_light == self.hope_light:
                # print("Curtain|0.999")
                print("OK")
            elif self.hope_light > self.inside_light:
                up_curtain = {'curtain': 'up'}
                json_change = json.dumps(up_curtain)
                print(json.dumps(up_curtain, indent=4))

            else:
                #print("Curtain| trun off!")
                down_curtain = {'curtain': 'down'}
                json_change = json.dumps(down_curtain)
                print(json.dumps(down_curtain, indent=4))

        else:
            if self.inside_light == self.hope_light:
                print("OK")

            elif self.hope_light > self.inside_light:
                down_led = {'led': 'up'}
                json_change = json.dumps(down_led)
                print(json.dumps(down_led, indent=4))

            else:
                up_led = {'led': 'down'}
                json_change = json.dumps(up_led)
                print(json.dumps(up_led, indent=4))


AverageLight().control_function()
