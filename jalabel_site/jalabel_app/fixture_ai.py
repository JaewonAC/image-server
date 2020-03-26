import os

import tensorflow as tf
from PIL import Image
import numpy as np

import json
import requests


class FixtureAI:
    def __init__(self):
        # self.tfserving_url = 'http://localhost:8501/v1/models/model:predict'
        print('tf.config.list_physical_devices')
        print(tf.config.list_physical_devices('GPU'))
        print('tf.test.is_built_with_cuda')
        print(tf.test.is_built_with_cuda)

        self.model = tf.saved_model.load('./jalabel_app/tf_models/20200220')
        self.signature = self.model.signatures["serving_default"]

        self.image_height = 1080
        self.image_width = 1920

        self.window_height = 128
        self.window_width = 128

        self.crop_top = 10
        self.crop_bottom = self.image_height - 10
        self.crop_left = 10
        self.crop_right = self.image_width - 10

        self.cropped_height = self.crop_bottom - self.crop_top
        self.cropped_width = self.crop_right - self.crop_left

        self.spacing_y = self.window_height//2
        self.spacing_x = self.window_width//2

        self.y_start, self.x_start = np.mgrid[self.crop_top:self.crop_bottom-self.window_height:self.window_height,
                                              self.crop_left:self.crop_right-self.window_width:self.window_width]
        self.y_start = self.y_start.flatten()
        self.x_start = self.x_start.flatten()
        self.y_end = self.y_start + self.window_height
        self.x_end = self.x_start + self.window_width

    def predict(self, image_file):
        image = Image.open(image_file)
        gray = np.array(image.convert('L'))
        prediction = np.zeros((self.image_height,
                               self.image_width,
                               4), dtype=np.uint8)

        headers = {"content-type": "application/json"}

        for ys, ye, xs, xe in zip(self.y_start, self.y_end, self.x_start, self.x_end):
            cropped_image_np = gray[ys:ye, xs:xe]
            cropped_image_np = np.expand_dims(cropped_image_np, axis=0)
            cropped_image_np = np.expand_dims(cropped_image_np, axis=3)

            # data_json = json.dumps(
            #     {'signature_name': 'serving_default',
            #      'instances': cropped_image_np.tolist()})
            # json_response = requests.post(self.tfserving_url, data=data_json, headers=headers)
            # cropped_prediction = json.loads(json_response.text)['predictions']
            # cropped_prediction = np.array(cropped_prediction[0])
            # cropped_prediction = np.pad(cropped_prediction, ((0, 0), (0, 0), (0, 2)))

            cropped_prediction = self.signature(input_1=tf.convert_to_tensor(cropped_image_np, dtype='float'))
            cropped_prediction = np.array(cropped_prediction['conv2d_29'], dtype=np.uint8)
            cropped_prediction = np.pad(cropped_prediction, ((0, 0), (0, 0), (0, 0), (0, 2))).squeeze()

            prediction[ys:ye, xs:xe] = cropped_prediction

        prediction[..., 3] = prediction[..., 1]
        prediction *= 255

        return Image.fromarray(prediction, mode='RGBA')

