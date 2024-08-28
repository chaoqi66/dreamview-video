FROM 10.199.2.149:8888/library_jackhu/clip_poster:3.5.2 AS base
LABEL authors="jack.hu"
RUN mkdir -p /app/dreamview_video
WORKDIR /app/dreamview_video
COPY . /app/dreamview_video/

# 设置环境变量
ENV DISPLAY=:99

RUN apt-get update
RUN apt-get install -y ffmpeg xvfb


# 安装 Node.js 和 npm
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

ENTRYPOINT ["Xvfb", ":99", "-screen", "0", "1920x1080x24"]
