# pull official base image
FROM python:3.7.5
ENV PYTHONUNBUFFERED 1
RUN mkdir /config
RUN pip install --upgrade pip
ADD /config/requirements.txt /config/
RUN pip install -r /config/requirements.txt
RUN mkdir /jalabel_site;
WORKDIR /jalabel_site