from django.contrib.auth.models import AbstractUser
from django.db import models

#User model with unique email field and username field as required fields
class User(AbstractUser):
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']


# Create your models h