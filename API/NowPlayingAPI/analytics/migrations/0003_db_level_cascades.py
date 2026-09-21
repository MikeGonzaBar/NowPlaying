from django.db import migrations

# R5 (migration plan, Phase 5 step 5): enforce referential integrity at the
# database level. Django's ORM cascades only run inside the ORM, so any
# non-ORM writer (raw SQL, Supabase SQL editor, future PostgREST writes)
# could previously orphan child rows. These statements recreate each app-level
# FK with ON DELETE CASCADE, matching the ORM's on_delete=CASCADE semantics.
# Django's own auth/admin tables are intentionally left untouched.
#
# NOTE: any future Django migration that alters these FK fields will recreate
# the constraints as NO ACTION; re-apply this migration's SQL if that happens.

FORWARD_SQL = """
ALTER TABLE analytics_gamingstreak DROP CONSTRAINT analytics_gamingstreak_user_id_d8f60d4c_fk_auth_user_id;
ALTER TABLE analytics_gamingstreak ADD CONSTRAINT analytics_gamingstreak_user_id_d8f60d4c_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE analytics_userstatistics DROP CONSTRAINT analytics_userstatistics_user_id_28f69a8a_fk_auth_user_id;
ALTER TABLE analytics_userstatistics ADD CONSTRAINT analytics_userstatistics_user_id_28f69a8a_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE music_song DROP CONSTRAINT music_song_user_id_36fad657_fk_auth_user_id;
ALTER TABLE music_song ADD CONSTRAINT music_song_user_id_36fad657_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE playstation_psnachievement DROP CONSTRAINT playstation_psnachie_game_id_2a3edb5b_fk_playstati;
ALTER TABLE playstation_psnachievement ADD CONSTRAINT playstation_psnachie_game_id_2a3edb5b_fk_playstati FOREIGN KEY (game_id) REFERENCES playstation_psngame(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE playstation_psngame DROP CONSTRAINT playstation_psngame_user_id_4d707a31_fk_auth_user_id;
ALTER TABLE playstation_psngame ADD CONSTRAINT playstation_psngame_user_id_4d707a31_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE retroachievements_gameachievement DROP CONSTRAINT retroachievements_ga_game_id_2f42a71f_fk_retroachi;
ALTER TABLE retroachievements_gameachievement ADD CONSTRAINT retroachievements_ga_game_id_2f42a71f_fk_retroachi FOREIGN KEY (game_id) REFERENCES retroachievements_retroachievementsgame(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE retroachievements_retroachievementsgame DROP CONSTRAINT retroachievements_re_user_id_32a99a64_fk_auth_user;
ALTER TABLE retroachievements_retroachievementsgame ADD CONSTRAINT retroachievements_re_user_id_32a99a64_fk_auth_user FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE steam_achievement DROP CONSTRAINT steam_achievement_game_id_f98476d4_fk_steam_game_id;
ALTER TABLE steam_achievement ADD CONSTRAINT steam_achievement_game_id_f98476d4_fk_steam_game_id FOREIGN KEY (game_id) REFERENCES steam_game(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE steam_game DROP CONSTRAINT steam_game_user_id_f9ac00b2_fk_auth_user_id;
ALTER TABLE steam_game ADD CONSTRAINT steam_game_user_id_f9ac00b2_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE trakt_episode DROP CONSTRAINT trakt_episode_season_id_64cb395d_fk_trakt_season_id;
ALTER TABLE trakt_episode ADD CONSTRAINT trakt_episode_season_id_64cb395d_fk_trakt_season_id FOREIGN KEY (season_id) REFERENCES trakt_season(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE trakt_episode DROP CONSTRAINT trakt_episode_show_id_23047dbd_fk_trakt_show_id;
ALTER TABLE trakt_episode ADD CONSTRAINT trakt_episode_show_id_23047dbd_fk_trakt_show_id FOREIGN KEY (show_id) REFERENCES trakt_show(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE trakt_episodewatch DROP CONSTRAINT trakt_episodewatch_episode_id_446390b9_fk_trakt_episode_id;
ALTER TABLE trakt_episodewatch ADD CONSTRAINT trakt_episodewatch_episode_id_446390b9_fk_trakt_episode_id FOREIGN KEY (episode_id) REFERENCES trakt_episode(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE trakt_movie DROP CONSTRAINT trakt_movie_user_id_acd811b2_fk_auth_user_id;
ALTER TABLE trakt_movie ADD CONSTRAINT trakt_movie_user_id_acd811b2_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE trakt_moviewatch DROP CONSTRAINT trakt_moviewatch_movie_id_0a675065_fk_trakt_movie_id;
ALTER TABLE trakt_moviewatch ADD CONSTRAINT trakt_moviewatch_movie_id_0a675065_fk_trakt_movie_id FOREIGN KEY (movie_id) REFERENCES trakt_movie(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE trakt_season DROP CONSTRAINT trakt_season_show_id_6d4cabed_fk_trakt_show_id;
ALTER TABLE trakt_season ADD CONSTRAINT trakt_season_show_id_6d4cabed_fk_trakt_show_id FOREIGN KEY (show_id) REFERENCES trakt_show(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE trakt_show DROP CONSTRAINT trakt_show_user_id_f8c24163_fk_auth_user_id;
ALTER TABLE trakt_show ADD CONSTRAINT trakt_show_user_id_f8c24163_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE trakt_trakttoken DROP CONSTRAINT trakt_trakttoken_user_id_049670a7_fk_auth_user_id;
ALTER TABLE trakt_trakttoken ADD CONSTRAINT trakt_trakttoken_user_id_049670a7_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE users_userapikey DROP CONSTRAINT users_userapikey_user_id_12b525d1_fk_auth_user_id;
ALTER TABLE users_userapikey ADD CONSTRAINT users_userapikey_user_id_12b525d1_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE xbox_xboxachievement DROP CONSTRAINT xbox_xboxachievement_game_id_d910ffc4_fk_xbox_xboxgame_id;
ALTER TABLE xbox_xboxachievement ADD CONSTRAINT xbox_xboxachievement_game_id_d910ffc4_fk_xbox_xboxgame_id FOREIGN KEY (game_id) REFERENCES xbox_xboxgame(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE xbox_xboxgame DROP CONSTRAINT xbox_xboxgame_user_id_a5d85ac9_fk_auth_user_id;
ALTER TABLE xbox_xboxgame ADD CONSTRAINT xbox_xboxgame_user_id_a5d85ac9_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
"""

REVERSE_SQL = FORWARD_SQL.replace("ON DELETE CASCADE ", "")


class Migration(migrations.Migration):

    dependencies = [
        ("analytics", "0002_remove_unused_models"),
        ("steam", "0009_achievement_unique_steam_game_achievement"),
        ("playstation", "0004_psnachievement_unique_psn_game_achievement"),
        ("xbox", "0005_xboxachievement_unique_xbox_game_achievement"),
    ]

    operations = [
        migrations.RunSQL(FORWARD_SQL, reverse_sql=REVERSE_SQL),
    ]
