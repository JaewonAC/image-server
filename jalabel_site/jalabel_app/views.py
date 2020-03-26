from pathlib import Path

from django.views.generic.edit import FormView, CreateView, UpdateView, DeleteView
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.conf import settings
# from django.db.models.functions import Extract

from .models import FixtureData
from .forms import FixtureDataForm, SearchForm
from . import fixture_ai
import datetime

from PIL import Image
import numpy as np
import json
import requests

fdo = FixtureData.objects


def index(request):
    fixtures = {'fixtures': [fd for fd in fdo.order_by('uploaded_date').values()]}
    return render(request, 'jalabel_app/index.html', fixtures)


class Capture(FormView):
    template_name = 'jalabel_app/capture.html'
    form_class = FixtureDataForm
    success_url = '/capture/'

    fai = fixture_ai.FixtureAI()

    def form_invalid(self, form):
        response = super().form_invalid(form)
        if self.request.is_ajax():
            print('it`s ajax but invalid')
            print(form.errors)
            return JsonResponse(form.errors, status=400)
        else:
            print('it isn`t ajax and invalid')
            return response

    def form_valid(self, form):
        response = super().form_valid(form)
        if self.request.is_ajax():
            if form.cleaned_data['message'] == 'unknown':
                fixture_data_object = form.save()
                prediction = self.fai.predict(self.request.FILES['image_data'])
                rle_path = 'fixture_rle/' + Path(fixture_data_object.image_data.name).name
                prediction.save(settings.MEDIA_ROOT + rle_path)
                fixture_data_object.rle_csv.name = rle_path
                fixture_data_object.save()

                data = {
                    'id': fixture_data_object.id,
                    'image_url': self.request.headers['Origin'] + '/media/' + fixture_data_object.image_data.name,
                    'rle_url': self.request.headers['Origin'] + '/media/' + fixture_data_object.rle_csv.name
                }
                return JsonResponse(data)

            elif form.cleaned_data['message'] == 'defect':
                fixture_data_object = fdo.get(uploaded_date=form.cleaned_data['uploaded_date'])
                fixture_data_object.message = 'defect'
                image = Image.open(self.request.FILES['rle_csv'])
                image.save(Path(settings.MEDIA_ROOT).joinpath(Path(fixture_data_object.rle_csv.name)))
                print(Path(settings.MEDIA_ROOT).joinpath(Path(fixture_data_object.rle_csv.name)))
                fixture_data_object.save()
                return JsonResponse({'Message': 'Image has classified to defect!'})

            elif form.cleaned_data['message'] == 'perfect':
                fixture_data_object = fdo.get(uploaded_date=form.cleaned_data['uploaded_date'])
                fixture_data_object.message = 'perfect'
                image = Image.open(self.request.FILES['rle_csv'])
                image.save(Path(settings.MEDIA_ROOT).joinpath(Path(fixture_data_object.rle_csv.name)))
                print(Path(settings.MEDIA_ROOT).joinpath(Path(fixture_data_object.rle_csv.name)))
                fixture_data_object.save()
                return JsonResponse({'Message': 'Image has classified to perfect!'})

            elif form.cleaned_data['message'] == 'delete':
                fixture_data_object = fdo.get(uploaded_date=form.cleaned_data['uploaded_date'])
                print(fixture_data_object)
                FixtureData.delete(fixture_data_object)
                return JsonResponse({'Message': 'Image has deleted!'})

            elif form.cleaned_data['message'] == 'later':
                fixture_data_object = fdo.get(uploaded_date=form.cleaned_data['uploaded_date'])
                fixture_data_object.message = 'later'
                fixture_data_object.save()
                return JsonResponse({'Message': 'Image has classified to later!'})

            else:
                return JsonResponse(
                    {'Message': 'Unknown message value. The value should be perfect, defect or unknown'},
                    status=400)
        else:
            print('it isn`t ajax but valid')
            return response


class Dashboard(FormView):
    template_name = 'jalabel_app/dashboard.html'
    form_class = SearchForm
    success_url = '/dashboard/'

    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get_context_data(self, **kwargs):
        number_of_objects = len(FixtureData.objects.all())

        context = {'form': self.form_class,
                   'dates': self.get_dates()}
        if number_of_objects > 48:
            context.update({'fixtures': [fd for fd in fdo.order_by('-uploaded_date')[0:48].values()]})
        else:
            context.update({'fixtures': [fd for fd in fdo.order_by('-uploaded_date').values()]})

        return context

    def form_invalid(self, form):
        response = super().form_invalid(form)
        if self.request.is_ajax():
            print('it`s ajax but invalid')
            print(form.errors)
            return JsonResponse(form.errors, status=400)
        else:
            print('it isn`t ajax and invalid')
            return response

    def form_valid(self, form):
        response = super().form_valid(form)
        if self.request.is_ajax():
            print('it`s ajax and valid')
            return response
        else:
            print('it isn`t ajax but valid')
            if form.cleaned_data['option'] == 'day':
                context = {'form': self.form_class,
                           'dates': self.get_dates(),
                           'fixtures': [fd for fd in fdo.filter(uploaded_date__contains=form.cleaned_data['uploaded_date_from'].date()).values()]}
                return render(self.request, 'jalabel_app/dashboard.html', context)
            elif form.cleaned_data['option'] == 'open':
                fixture_data_object = fdo.get(uploaded_date=form.cleaned_data['uploaded_date_from'])
                print(self.request.headers['Origin'] +
                      '/media/' + fixture_data_object.image_data.name)
                form = FixtureDataForm(
                    initial={'id': fixture_data_object.id,
                             'lot_number': fixture_data_object.lot_number,
                             'message': fixture_data_object.message,
                             'uploaded_date': (fixture_data_object.uploaded_date +
                                               datetime.timedelta(hours=9)).strftime("%Y-%m-%d %H:%M:%S.%f"),
                             'rle_csv': self.request.headers['Origin'] +
                                        '/media/' + fixture_data_object.rle_csv.name}
                )
                '''
                the uploaded_date part need to be developed better.
                '''
                return render(self.request, 'jalabel_app/capture.html', {'form': form})
            else:
                pass
            return response

    def get_dates(self):
        if len(FixtureData.objects.all()) > 0:
            first_day = fdo.order_by('uploaded_date')[0].uploaded_date.date()
            last_day = fdo.order_by('-uploaded_date')[0].uploaded_date.date()
            dates = []
            for x in range((last_day-first_day).days + 1):
                date = first_day + datetime.timedelta(days=x)
                length = len(fdo.filter(uploaded_date__contains=date))
                if length > 0:
                    dates.append({'date': date, 'number_of_data': length})
            return dates

