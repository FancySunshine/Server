import pymysql
import time
import sys
import threading
"""
각 조명에 대한 평균값 구하기 (알고리즘 설계)
"""

# 5초 마다
# 5분간 데이터 평균
def my_data_insert(i):
    conn = pymysql.connect(host='localhost', user='root',
                           password='0000', db='curtain', charset='utf8')
    cursor = conn.cursor()

    sql = "SELECT * FROM brightness"

    cursor.execute(sql)
    res = cursor.fetchall()

    conn.commit()
    conn.close()
    return sum([arr[i] for arr in res]) / len(res)


class AverageLight():
    def __init__(self, hope_light):
        self.inside_light = my_data_insert(1)
        self.outside_light = my_data_insert(2)
        self.hope_list = hope_light
    

    def control_function(self):
        print(f"linear average --> {self.inside_light}")
        print(f"outline average --> {self.outside_light}")
        while True:
            time.sleep(2)
            try:
                if self.inside_light < self.outside_light:
                    if self.inside_light == self.hope_list:
                        print("LED right")
                    else:
                        print("LED trun off!")
                else:
                    if self.inside_light == self.hope_list:
                        print("OK")
                    elif self.hope_list > self.inside_light:
                        print("curtain up")
                    else:
                        print("curtain down")
            except:
                print("ㄴㄴ")


if __name__ == "__main__":
    threading.Timer(5000, AverageLight(sys.argv[1]).control_function()).start()
