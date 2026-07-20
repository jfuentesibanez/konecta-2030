[FICTICIO — material de taller]
# Proceso: gestión de devoluciones de pedidos online (cliente retail ficticio "ModaExpress")
Volumen: ~45.000 gestiones/mes, 60% chat, 40% email. Equipo actual: 38 agentes.
Flujo actual: (1) cliente contacta con nº de pedido; (2) agente verifica compra en el sistema de pedidos
(aplicación web interna, sin API); (3) aplica política: <30 días y sin uso → devolución; 30-60 días → vale;
>60 días → rechazo salvo defecto; (4) si defecto: pide foto, evalúa, puede escalar a supervisor; (5) genera
etiqueta de envío y confirma por email; (6) registra el motivo en un Excel compartido para el informe mensual.
Dolores conocidos: los agentes tardan ~7 min/gestión (el sistema de pedidos es lento), el Excel de motivos se
rellena mal, y el 12% de los casos escala a supervisor por dudas con la política de defectos.
Datos: historial de 24 meses de gestiones etiquetadas. Sensibilidad: datos personales de clientes (dirección,
compras). El cliente exige que las decisiones de rechazo las revise un humano.
