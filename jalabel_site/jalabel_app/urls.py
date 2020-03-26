from django.urls import path

from . import views

app_name = 'jalabel_app'
urlpatterns = [
    path('', views.index, name='index'),
    path('capture/', views.Capture.as_view(), name='capture'),
    path('dashboard/', views.Dashboard.as_view(), name='dashboard')
]

