
## Create test database

The test script expect a oracle instance on localhost, with user TEST identified by password TEST.
Use the following queries to create the USER/SCHEMA (execute with Oracle system user).

```sql
CREATE USER TEST IDENTIFIED BY TEST;
GRANT CONNECT, RESOURCE TO TEST;
GRANT INSERT ANY TABLE TO TEST;
GRANT SELECT ANY TABLE TO TEST;
GRANT SELECT ANY SEQUENCE TO TEST;
```

Use the following queries to create expected tables.

```sql

  CREATE TABLE "foo" (
    "id" VARCHAR(255),
    "p1" VARCHAR(255),
    "p2" VARCHAR(255),
    "p3" VARCHAR(255),
    "seneca" VARCHAR(255)
  );

  CREATE TABLE "moon_bar" (
    "id" VARCHAR(255),
    "str" VARCHAR(255),
    "int" INTEGER,
    "dec" DECIMAL(5, 2),
    "bol" CHAR check ("bol" in ('T','F')),
    "wen" TIMESTAMP,
    "arr" CLOB,
    "obj" CLOB,
    "mark" FLOAT,
    "seneca" VARCHAR(255)
  );

  CREATE TABLE "lmt" (
    "id" VARCHAR(255),
    "p1" VARCHAR(255),
    "p2" VARCHAR(255),
    "seneca" VARCHAR(255)
  );
```

## Run tests

```
  npm test
```

or

```
  cd test
  mocha oracle.test.js
```
