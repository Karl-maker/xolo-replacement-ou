-- Run once, as a Postgres superuser, against any database (for example "postgres").
-- Creates a test database with its own role. That role owns only oum_test and holds no
-- privileges on the development database, so a mistake in a test cannot damage real data.
CREATE ROLE oum_test LOGIN PASSWORD 'oum_test';
CREATE DATABASE oum_test OWNER oum_test;
-- Postgres lets everyone connect to new databases by default; close that door for the dev database.
REVOKE CONNECT ON DATABASE oum FROM PUBLIC;
