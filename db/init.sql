--
-- PostgreSQL database schema initialization
--
-- Dumped from database version 14.22
-- Generated from narqdb on localhost
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: notify_new_message(); Type: FUNCTION; Schema: public
--

CREATE FUNCTION public.notify_new_message() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  payload TEXT;
BEGIN
  payload := NEW.queue_id::text;
  PERFORM pg_notify('new_message', payload);
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: queues; Type: TABLE; Schema: public
--

CREATE TABLE public.queues (
    id bigint NOT NULL,
    name text NOT NULL,
    config jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    type character varying(255)
);

CREATE SEQUENCE public.queues_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.queues_id_seq OWNED BY public.queues.id;

ALTER TABLE ONLY public.queues ALTER COLUMN id SET DEFAULT nextval('public.queues_id_seq'::regclass);

ALTER TABLE ONLY public.queues
    ADD CONSTRAINT queues_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.queues
    ADD CONSTRAINT queues_name_key UNIQUE (name);


--
-- Name: messages; Type: TABLE; Schema: public
--

CREATE TABLE public.messages (
    id bigint NOT NULL,
    queue_id bigint NOT NULL,
    content jsonb NOT NULL,
    state text DEFAULT 'pending'::text NOT NULL,
    priority integer DEFAULT 0,
    group_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ready_at timestamp with time zone DEFAULT now() NOT NULL,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 5,
    delay_after_processing integer DEFAULT 0,
    process_start timestamp without time zone,
    max_process_time integer DEFAULT 120
);

CREATE SEQUENCE public.messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT parent_queue_id FOREIGN KEY (queue_id) REFERENCES public.queues(id) ON DELETE CASCADE;

CREATE INDEX idx_messages_fetch ON public.messages USING btree (queue_id, state, ready_at, priority, created_at);

CREATE TRIGGER messages_insert_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();
