-- Последовательность номеров заказов (BA-100001, BA-100002, ...)
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 100001;
-- Последовательности номеров заявок на рассрочку и б/у экземпляров
CREATE SEQUENCE IF NOT EXISTS application_number_seq START WITH 5001;
CREATE SEQUENCE IF NOT EXISTS used_unit_code_seq START WITH 1001;
