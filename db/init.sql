CREATE TABLE clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  rfc VARCHAR(12) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  status ENUM('pending', 'approved') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE operations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  advanced_amount DECIMAL(12,2) NOT NULL,
  commission DECIMAL(12,2) NOT NULL,
  amount_to_deposit DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  operation_id INT NOT NULL,
  client_id INT NOT NULL,
  folio VARCHAR(100) NOT NULL,
  debtor VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  FOREIGN KEY (operation_id) REFERENCES operations(id),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  UNIQUE KEY uq_client_folio (client_id, folio)
);