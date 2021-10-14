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
sql = "SELECT * FROM brightness order by `time` desc limit 1"

cursor.execute(sql)
res = cursor.fetchall()
conn.commit()
conn.close()


inside = res[0][1]
outside = res[0][2]

#in_average = np.array(inside).mean()
#out_average = np.array(outside).mean()
#print('in_average from DB : ', in_average)
#print('out_average from DB : ', out_average)
lux_standard = [0, 40, 120, 200, 280, 360]

class AverageLight():
    def __init__(self):
        self.inside_light = inside
        self.outside_light = outside
        #self.hope_light = lux_standard[int(sys.argv[1])]
        #self.curtain_step = int(sys.argv[2])
        #self.led_bright = int(sys.argv[3])

    def control_function(self):
        #print(f"linear average --> {self.inside_light}")
        #print(f"outline average --> {self.outside_light}")
        self.inside_light = 200
        self.outside_light = 300
        self.hope_light = 120
        self.curtain_step = int(float(sys.argv[2]))
        self.led_bright = int(float(sys.argv[3]))

        min_light = self.hope_light - 40
        max_light = self.hope_light + 40

        if self.inside_light < self.outside_light:
            if min_light <= self.inside_light < max_light:
                # print("Curtain|0.999")
                print("OK")
            elif min_light >= self.inside_light:
                if self.curtain_step != 0:
                    #up_curtain = {'curtain': 'up'}
                    up_curtain = {'curtain': self.curtain_step - 1}
                    json_change = json.dumps(up_curtain)
                    print(json.dumps(up_curtain, indent=4))
                else:
                    if self.led_bright <= 95:
                        #print(json.dumps({'led': 'up'}, indent=4))
                        print(json.dumps({'led': self.led_bright + 5}, indent=4))

            elif max_light <= self.inside_light:
                if self.curtain_step < 4:
                #print("Curtain| trun off!")
                    #down_curtain = {'curtain': 'down'}
                    down_curtain = {'curtain': self.curtain_step + 1}
                    json_change = json.dumps(down_curtain)
                    print(json.dumps(down_curtain, indent=4))
                else:
                    if self.led_bright >= 5:
                        #print(json.dumps({'led': 'down'}, indent=4))
                        print(json.dumps({'led': self.led_bright - 5}, indent=4))

        else:
            if min_light <= self.inside_light < max_light:
                print("OK")

            elif min_light >= self.inside_light:
                if self.led_bright <= 95:
                    #down_led = {'led': 'up'}
                    down_led = {'led': self.led_bright + 5}
                    json_change = json.dumps(down_led)
                    print(json.dumps(down_led, indent=4))
                else:
                    if self.curtain_step != 0:
                        #print(json.dumps({'curtain': 'up'}, indent=4))
                        print(json.dumps({'curtain': self.curtain_step - 1}, indent=4))

            elif max_light <= self.inside_light:
                if self.led_bright >= 5:
                    #up_led = {'led': 'down'}
                    up_led = {'led': self.led_bright - 5}
                    json_change = json.dumps(up_led)
                    print(json.dumps(up_led, indent=4))
                else:
                    if self.curtain_step != 4:
                        #print(json.dumps({'curtain': 'down'}, indent=4))
                        print(json.dumps({'curtain': self.curtain_step + 1}, indent=4))

AverageLight().control_function()
