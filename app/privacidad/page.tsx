export const metadata = { title: 'Política de Privacidad — LABLLD' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-gray">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidad</h1>
        <p className="text-sm text-gray-500 mb-10">Última actualización: agosto 2026</p>

        <p>
          LABLLD ("<strong>nosotros</strong>", "<strong>nuestro</strong>" o "<strong>la Empresa</strong>")
          opera la plataforma disponible en <strong>app.lablld.com</strong> (el "<strong>Servicio</strong>").
          Esta Política de Privacidad describe cómo recopilamos, usamos y protegemos su información personal.
        </p>

        <h2>1. Información que recopilamos</h2>
        <p>Recopilamos la siguiente información cuando usted se registra o usa el Servicio:</p>
        <ul>
          <li><strong>Información de cuenta:</strong> nombre completo, correo electrónico y contraseña.</li>
          <li><strong>Información de pago:</strong> datos de tarjeta de crédito procesados de forma segura a través de Wompi. No almacenamos datos de tarjeta en nuestros servidores.</li>
          <li><strong>Información de tienda:</strong> dominio de tienda Shopify y datos de acceso OAuth necesarios para la integración.</li>
          <li><strong>Datos de pedidos:</strong> información sobre pedidos, productos, clientes finales y envíos necesaria para el servicio de fulfillment.</li>
          <li><strong>Datos de uso:</strong> páginas visitadas, acciones realizadas dentro de la plataforma e información del dispositivo.</li>
        </ul>

        <h2>2. Cómo usamos su información</h2>
        <p>Utilizamos la información recopilada para:</p>
        <ul>
          <li>Prestar y mejorar el Servicio de fulfillment de etiqueta blanca.</li>
          <li>Procesar pagos y gestionar suscripciones.</li>
          <li>Sincronizar productos y pedidos con su tienda Shopify.</li>
          <li>Enviar notificaciones transaccionales sobre el estado de pedidos y cotizaciones.</li>
          <li>Atender solicitudes de soporte.</li>
          <li>Cumplir con obligaciones legales y prevenir fraudes.</li>
        </ul>

        <h2>3. Compartición de información con terceros</h2>
        <p>Compartimos información con terceros únicamente en los siguientes casos:</p>
        <ul>
          <li><strong>Shopify:</strong> para sincronización de productos, pedidos y fulfillment según la integración OAuth autorizada por usted.</li>
          <li><strong>Wompi:</strong> para el procesamiento seguro de pagos.</li>
          <li><strong>Supabase:</strong> proveedor de infraestructura de base de datos y autenticación.</li>
          <li><strong>Resend:</strong> proveedor de envío de correos transaccionales.</li>
          <li><strong>Vercel:</strong> proveedor de hosting de la plataforma.</li>
        </ul>
        <p>No vendemos ni alquilamos su información personal a terceros con fines de marketing.</p>

        <h2>4. Seguridad</h2>
        <p>
          Implementamos medidas de seguridad técnicas y organizativas razonables para proteger
          su información, incluyendo cifrado en tránsito (HTTPS) y en reposo, control de acceso
          basado en roles y autenticación segura. Sin embargo, ningún sistema es completamente
          infalible.
        </p>

        <h2>5. Retención de datos</h2>
        <p>
          Conservamos su información mientras su cuenta esté activa o según sea necesario para
          prestar el Servicio. Puede solicitar la eliminación de su cuenta y datos personales
          contactándonos en <strong>soporte@lablld.com</strong>. Los datos de pedidos pueden
          conservarse por razones legales y contables hasta por 5 años.
        </p>

        <h2>6. Sus derechos</h2>
        <p>Usted tiene derecho a:</p>
        <ul>
          <li>Acceder a los datos personales que tenemos sobre usted.</li>
          <li>Solicitar la corrección de datos inexactos.</li>
          <li>Solicitar la eliminación de sus datos (derecho al olvido).</li>
          <li>Oponerse al procesamiento de sus datos en determinadas circunstancias.</li>
          <li>Solicitar la portabilidad de sus datos.</li>
        </ul>
        <p>
          Para ejercer cualquiera de estos derechos, contáctenos en <strong>soporte@lablld.com</strong>.
        </p>

        <h2>7. Cookies</h2>
        <p>
          Usamos cookies estrictamente necesarias para mantener su sesión activa dentro de la
          plataforma. No usamos cookies de rastreo ni publicidad de terceros.
        </p>

        <h2>8. Integración con Shopify</h2>
        <p>
          Al conectar su tienda Shopify, usted autoriza a LABLLD a acceder a los scopes
          de permisos que aprobó durante la instalación de la app (lectura/escritura de
          productos, pedidos y fulfillment). Puede revocar este acceso en cualquier momento
          desde la configuración de su cuenta en LABLLD o desde el panel de administración
          de Shopify.
        </p>

        <h2>9. Cambios a esta política</h2>
        <p>
          Podemos actualizar esta Política de Privacidad periódicamente. Le notificaremos
          sobre cambios significativos mediante correo electrónico o mediante un aviso
          prominente en la plataforma antes de que el cambio entre en vigor.
        </p>

        <h2>10. Contacto</h2>
        <p>
          Si tiene preguntas sobre esta Política de Privacidad, contáctenos en:<br />
          <strong>LABLLD</strong><br />
          Correo: <strong>soporte@lablld.com</strong>
        </p>
      </div>
    </div>
  )
}
