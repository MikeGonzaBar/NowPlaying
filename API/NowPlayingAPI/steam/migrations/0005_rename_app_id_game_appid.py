# Generated by Django 5.1.6 on 2025-04-09 06:34

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('steam', '0004_achievement_game_delete_steam_achievement_game'),
    ]

    operations = [
        migrations.RenameField(
            model_name='game',
            old_name='app_id',
            new_name='appid',
        ),
    ]
