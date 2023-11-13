DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users(
    user_id INTEGER PRIMARY KEY,
    username VARCHAR(40) NOT NULL,
    password CHAR(60) NOT NULL,
    first_name VARCHAR(60),
    last_name VARCHAR(60),
);

DROP TABLE IF EXISTS top_artists CASCADE;
CREATE TABLE top_artists(
    user_id INTEGER,
    short_term_top_artists VARCHAR(200) ARRAY[10],
    medium_term_top_artists VARCHAR(200) ARRAY[10],
    long_term_top_artists VARCHAR(200) ARRAY[10],
);

DROP TABLE IF EXISTS top_tracks CASCADE;
CREATE TABLE top_tracks(
    user_id INTEGER,
    short_term_top_tracks VARCHAR(200) ARRAY[10],
    medium_term_top_tracks VARCHAR(200) ARRAY[10],
    long_term_top_tracks VARCHAR(200) ARRAY[10],
);

DROP TABLE IF EXISTS top_records CASCADE;
CREATE TABLE top_records(
    user_id INTEGER,
    short_term_top_records VARCHAR(200) ARRAY[10],
    medium_term_top_records VARCHAR(200) ARRAY[10],
    long_term_top_records VARCHAR(200) ARRAY[10],
);

CREATE TABLE top_genres(
    user_id INTEGER,
    short_term_top_genres VARCHAR(200) ARRAY[10],
    medium_term_top_genres VARCHAR(200) ARRAY[10],
    long_term_top_genres VARCHAR(200) ARRAY[10],
);