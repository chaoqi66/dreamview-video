import argparse
import os
import random
import subprocess

import boto3

bucket_name = "datahub"
node_number = random.randint(83, 96)
ENDPOINT_URL = f"http://10.199.199.{node_number}:8082/"

s3_client = boto3.client('s3',
                         aws_access_key_id="5TQZ57M2T6ECVAM9H2E5",
                         aws_secret_access_key="aCtNWzSDPEUft1UKz3C8gCMNaYgehIdpk2FJM3Mq",
                         endpoint_url=ENDPOINT_URL,
                         use_ssl=False
                         )

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='dreamview_video')
    # 2. 添加命令行参数
    parser.add_argument('--input_dir', type=str, default="s3://ros-bags/collected_data/35236_196_WeiLai-006_dave.du_2024-06-17-15-26-01/35236_196_WeiLai-006_dave.du_2024-06-17-15-26-01_33/")

    args = parser.parse_args()
    input_dir =args.input_dir
    if input_dir:
        local_dir = "/tmp_data_1"
        os.makedirs(local_dir, exist_ok=True)

        s3cmd = f's3cmd -c /home/sti/.s3cfg get --recursive {input_dir} {local_dir} --force'
        subprocess.run(s3cmd, shell=True, check=False)

        generate_binary = [
            '/app/clip_poster/modules/simulation_world/build/aloha',
            '/app/clip_poster/modules/config/vehicle_param.pb.txt',
            local_dir
        ]
        subprocess.run(generate_binary, check=True)
        print('end generate binary')

        env = {'DISPLAY': ':99'}
        generate_video = [
            'node',
            'index.js',
            local_dir
        ]
        subprocess.run(generate_video, check=True)
        print('end generate video')

        print('start upload video')
        video_path = os.path.join(local_dir, 'dv_default.mp4')

        parts = input_dir.split('/')
        trip_name = parts[-3]
        clip_name = parts[-2]
        s3_dir = f'parsed_data/{trip_name}/{clip_name}/lidar/dv_default.mp4'
        print('http://10.199.2.100:8082/TenantAI:datahub/' + s3_dir)
        s3_client.upload_file(video_path, bucket_name, s3_dir)
        print('start upload video')
    else:
        print('请输入s3路径')
