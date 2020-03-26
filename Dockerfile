# pull official base image
FROM tensorflow/tensorflow:2.1.0-gpu-py3
ENV PYTHONUNBUFFERED 1
RUN mkdir /config
RUN pip install --upgrade pip
ADD /config/requirements.txt /config/
RUN pip install -r /config/requirements.txt
RUN mkdir /jalabel_site;
WORKDIR /jalabel_site