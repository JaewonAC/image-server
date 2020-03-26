from django import forms
from crispy_forms.helper import FormHelper
from .models import FixtureData


class FixtureDataForm(forms.ModelForm):
    class Meta:
        model = FixtureData
        fields = ('uploaded_date', 'lot_number', 'message', 'image_data', 'rle_csv')
        widgets = {
            'message': forms.HiddenInput(),
            'rle_csv': forms.HiddenInput(),
            'image_data': forms.ClearableFileInput(attrs={'multiple': True})
        }

    def __init__(self, *args, **kwargs):
        self.helper = FormHelper()
        self.helper.form_id = 'uploadForm'
        self.helper.form_method = 'post'

        super(FixtureDataForm, self).__init__(*args, **kwargs)


class SearchForm(forms.Form):
    uploaded_date_from = forms.DateTimeField()
    uploaded_date_to = forms.DateTimeField(required=False)
    lot_number = forms.CharField(max_length=20, required=False)
    message = forms.CharField(max_length=20, required=False)
    option = forms.CharField(max_length=20)

    def __init__(self, *args, **kwargs):
        self.helper = FormHelper()
        self.helper.form_id = 'searchForm'
        self.helper.form_method = 'post'

        super(SearchForm, self).__init__(*args, **kwargs)

