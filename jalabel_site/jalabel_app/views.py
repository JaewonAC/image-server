from pathlib import Path

from django.urls import reverse_lazy
from django.views.generic import ListView, DetailView
from django.views.generic.edit import FormView, CreateView, UpdateView, DeleteView
from django.http import JsonResponse
from django.shortcuts import render
from django.conf import settings

from .models import FixtureData
from .forms import SearchForm
from . import fixture_ai
import datetime

from crispy_forms.helper import FormHelper

fdo = FixtureData.objects


def index(request):
    fixtures = {'fixtures': [fd for fd in fdo.order_by('uploaded_date').values()]}
    return render(request, 'jalabel_app/index.html', fixtures)


class CaptureCreate(CreateView):
    model = FixtureData
    fields = ['uploaded_date', 'lot_number', 'image_data']

    fai = fixture_ai.FixtureAI()

    def form_invalid(self, form, *args, **kwargs):
        response = super().form_valid(form)
        return response

    def form_valid(self, form, *args, **kwargs):
        response = super().form_valid(form)

        fixture_data_object = form.save()
        prediction = self.fai.predict(self.request.FILES['image_data'])
        rle_path = 'fixture_rle/' + Path(fixture_data_object.image_data.name).name
        prediction.save(settings.MEDIA_ROOT + rle_path)
        fixture_data_object.rle_csv.name = rle_path
        fixture_data_object.save()
        return JsonResponse({'id': fixture_data_object.id})

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        form.helper = FormHelper()
        form.helper.form_id = 'uploadForm'
        form.helper.form_method = 'post'
        return form


class CaptureUpdate(UpdateView):
    model = FixtureData
    fields = ['uploaded_date', 'lot_number', 'message', 'image_data', 'rle_csv']
    template_name_suffix = '_update_form'

    def form_valid(self, form):
        response = super().form_valid(form)
        fixture_data_object = form.save()
        fixture_data_object.save()
        return response

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        form.helper = FormHelper()
        form.helper.form_id = 'uploadForm'
        form.helper.form_method = 'post'
        return form


class CaptureDelete(DeleteView):
    model = FixtureData
    success_url = reverse_lazy('jalabel_app:capture-create')


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
            context.update({'fixtures': fdo.order_by('-uploaded_date')[0:48]})
        else:
            context.update({'fixtures': fdo.order_by('-uploaded_date')})

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
            print('it isn`t ajax but valid ' + form.cleaned_data['option'])
            if form.cleaned_data['option'] == 'day':
                context = {'form': self.form_class,
                           'dates': self.get_dates(),
                           'fixtures': fdo.filter(
                               uploaded_date__contains=form.cleaned_data['uploaded_date_from'].date())}
                return render(self.request, 'jalabel_app/dashboard.html', context)
            elif form.cleaned_data['option'] == 'lot number':
                print(form.cleaned_data['lot_number'])
                context = {'form': self.form_class,
                           'dates': self.get_dates(),
                           'fixtures': fdo.filter(
                               lot_number__contains=form.cleaned_data['lot_number'])}
                return render(self.request, 'jalabel_app/dashboard.html', context)
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

