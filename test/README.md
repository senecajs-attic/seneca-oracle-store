
CREATE TABLE foo (
  id VARCHAR(255),
  p1 VARCHAR(255),
  p2 VARCHAR(255),
  seneca VARCHAR(255)
);

CREATE TABLE moon_bar (
  id VARCHAR(255),
  str VARCHAR(255),
  int INTEGER,
  dec DECIMAL(5, 2),
  bol CHAR check (bol in ('T','F')),
  wen TIMESTAMP,
  arr CLOB,
  obj CLOB,
  mark FLOAT,
  seneca VARCHAR(255)
);