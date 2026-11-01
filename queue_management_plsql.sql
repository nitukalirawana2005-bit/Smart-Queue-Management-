-- Smart Queue Management System: Oracle PL/SQL database layer
-- Run in SQL*Plus, SQL Developer or Oracle Live SQL

-- 1. Sequence: token numbers start at 101 and increase by 1
CREATE SEQUENCE token_seq START WITH 101 INCREMENT BY 1 NOCACHE;

-- 2. Table: one row per customer in the queue
CREATE TABLE queue_customers (
  token_no      NUMBER PRIMARY KEY,
  customer_name VARCHAR2(100) NOT NULL,
  status        VARCHAR2(10) DEFAULT 'WAITING' NOT NULL
                CHECK (status IN ('WAITING', 'SERVED')),
  joined_at     TIMESTAMP DEFAULT SYSTIMESTAMP,
  served_at     TIMESTAMP
);

-- 3. Trigger: assigns the next unique token automatically on insert
CREATE OR REPLACE TRIGGER trg_assign_token
BEFORE INSERT ON queue_customers
FOR EACH ROW
WHEN (NEW.token_no IS NULL)
BEGIN
  :NEW.token_no := token_seq.NEXTVAL;
END;
/

-- 4. View: waiting customers in service order
CREATE OR REPLACE VIEW v_waiting_queue AS
SELECT token_no, customer_name, joined_at
FROM   queue_customers
WHERE  status = 'WAITING'
ORDER  BY token_no;

CREATE OR REPLACE PACKAGE queue_pkg AS
  c_avg_service_min CONSTANT NUMBER := 5;   -- same as serviceTime in script.js

  PROCEDURE generate_token (p_name IN VARCHAR2, p_token OUT NUMBER);
  PROCEDURE serve_next     (p_token OUT NUMBER, p_name OUT VARCHAR2);
  FUNCTION  total_waiting  RETURN NUMBER;
  FUNCTION  next_token_no  RETURN NUMBER;
  FUNCTION  wait_for_position (p_position IN NUMBER) RETURN NUMBER;
  FUNCTION  estimated_wait RETURN NUMBER;
  FUNCTION  avg_actual_wait RETURN NUMBER;
  PROCEDURE show_queue;
END queue_pkg;
/

CREATE OR REPLACE PACKAGE BODY queue_pkg AS

  -- Enqueue: validate the name, insert a WAITING row, return the token
  PROCEDURE generate_token (p_name IN VARCHAR2, p_token OUT NUMBER) IS
    v_name VARCHAR2(100) := TRIM(p_name);
  BEGIN
    IF v_name IS NULL THEN
      RAISE_APPLICATION_ERROR(-20001, 'Customer name is required.');
    END IF;
    INSERT INTO queue_customers (customer_name)
    VALUES (v_name)
    RETURNING token_no INTO p_token;
    COMMIT;
  END generate_token;

  -- Dequeue: serve the waiting customer with the lowest token (FIFO)
  PROCEDURE serve_next (p_token OUT NUMBER, p_name OUT VARCHAR2) IS
    CURSOR c_front IS
      SELECT token_no, customer_name
      FROM   queue_customers
      WHERE  status = 'WAITING'
      ORDER  BY token_no
      FOR UPDATE;
  BEGIN
    OPEN c_front;
    FETCH c_front INTO p_token, p_name;
    IF c_front%NOTFOUND THEN
      CLOSE c_front;
      RAISE_APPLICATION_ERROR(-20002, 'No customers in the queue.');
    END IF;
    UPDATE queue_customers
    SET    status = 'SERVED', served_at = SYSTIMESTAMP
    WHERE CURRENT OF c_front;
    CLOSE c_front;
    COMMIT;
  END serve_next;

  FUNCTION total_waiting RETURN NUMBER IS
    v_count NUMBER;
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM   queue_customers WHERE status = 'WAITING';
    RETURN v_count;
  END total_waiting;

  FUNCTION next_token_no RETURN NUMBER IS
    v_next NUMBER;
  BEGIN
    SELECT NVL(MAX(token_no) + 1, 101) INTO v_next FROM queue_customers;
    RETURN v_next;
  END next_token_no;

  -- Waiting time of the customer at a queue position (position 1 waits 0)
  FUNCTION wait_for_position (p_position IN NUMBER) RETURN NUMBER IS
  BEGIN
    RETURN GREATEST(p_position - 1, 0) * c_avg_service_min;
  END wait_for_position;

  -- Waiting time of the last token in the queue
  FUNCTION estimated_wait RETURN NUMBER IS
  BEGIN
    RETURN wait_for_position(total_waiting);
  END estimated_wait;

  -- Average real waiting time (minutes) of customers already served
  FUNCTION avg_actual_wait RETURN NUMBER IS
    v_avg NUMBER;
  BEGIN
    SELECT NVL(ROUND(AVG((CAST(served_at AS DATE)
                        - CAST(joined_at AS DATE)) * 1440), 1), 0)
    INTO   v_avg
    FROM   queue_customers
    WHERE  status = 'SERVED';
    RETURN v_avg;
  END avg_actual_wait;

  PROCEDURE show_queue IS
  BEGIN
    FOR r IN (SELECT token_no, customer_name,
                     wait_for_position(ROW_NUMBER() OVER (ORDER BY token_no))
                       AS wait_min
              FROM   queue_customers
              WHERE  status = 'WAITING'
              ORDER  BY token_no) LOOP
      DBMS_OUTPUT.PUT_LINE('Token ' || r.token_no || ' - ' || r.customer_name
                           || ' | Estimated Waiting Time: ' || r.wait_min
                           || ' minutes');
    END LOOP;
  END show_queue;

END queue_pkg;
/

-- Demo
SET SERVEROUTPUT ON
DECLARE
  v_token NUMBER;
  v_name  VARCHAR2(100);
BEGIN
  queue_pkg.generate_token('Rahul', v_token);
  DBMS_OUTPUT.PUT_LINE('Issued token: ' || v_token);
  queue_pkg.generate_token('Priya', v_token);
  DBMS_OUTPUT.PUT_LINE('Issued token: ' || v_token);

  queue_pkg.show_queue;
  DBMS_OUTPUT.PUT_LINE('Waiting: ' || queue_pkg.total_waiting ||
      ' | Next token: ' || queue_pkg.next_token_no ||
      ' | Est. wait: ' || queue_pkg.estimated_wait || ' min');

  queue_pkg.serve_next(v_token, v_name);
  DBMS_OUTPUT.PUT_LINE('Now serving token ' || v_token || ' - ' || v_name);
END;
/
