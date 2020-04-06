from django.urls import path

from . import views

app_name = 'jalabel_app'
urlpatterns = [
    path('', views.index, name='index'),
    path('capture/add/', views.CaptureCreate.as_view(), name='capture-create'),
    path('capture/<int:pk>/', views.CaptureUpdate.as_view(), name='capture-update'),
    path('capture/<int:pk>/delete/', views.CaptureDelete.as_view(), name='capture-delete'),
    path('dashboard/', views.Dashboard.as_view(), name='dashboard')
]

