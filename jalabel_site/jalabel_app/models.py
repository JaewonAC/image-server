from django.db import models
from sorl import thumbnail
from django.urls import reverse


class FixtureData(models.Model):
    lot_number = models.CharField(max_length=20)
    image_data = thumbnail.ImageField(upload_to='fixture/', blank=True)
    message = models.CharField(max_length=20, default='unknown')
    uploaded_date = models.DateTimeField(unique=True)
    last_modified = models.DateTimeField(auto_now=True)
    rle_csv = models.ImageField(upload_to='fixture_rle/', blank=True)

    def get_absolute_url(self):
        return '../add/'

