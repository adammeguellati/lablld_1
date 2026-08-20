export const metadata = { title: 'Términos de Uso — LABLLD' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white py-16 px-4">
      <div className="max-w-3xl mx-auto prose prose-gray">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Términos de Uso</h1>
        <p className="text-sm text-gray-500 mb-10">Última actualización: agosto 2026</p>

        <p>
          Bienvenido a <strong>LABLLD</strong>. Al acceder o usar nuestra plataforma en
          <strong> app.lablld.com</strong> (el &quot;<strong>Servicio</strong>&quot;), usted acepta
          quedar vinculado por estos Términos de Uso (&quot;<strong>Términos</strong>&quot;).
          Léalos detenidamente antes de usar el Servicio.
        </p>

        <h2>1. Descripción del Servicio</h2>
        <p>
          LABLLD es una plataforma B2B de fulfillment de etiqueta blanca que permite a
          merchants registrados personalizar productos de belleza y suplementos con su propia
          marca, conectar su tienda Shopify y delegar el fulfillment físico a LABLLD desde
          Colombia y República Dominicana.
        </p>

        <h2>2. Elegibilidad y cuenta</h2>
        <p>
          Para usar el Servicio debe: (a) ser mayor de 18 años, (b) ser una empresa o
          persona natural con actividad comercial legítima, y (c) proporcionar información
          veraz durante el registro. Usted es responsable de mantener la confidencialidad
          de sus credenciales de acceso.
        </p>

        <h2>3. Suscripción y pagos</h2>
        <p>
          El Servicio opera bajo un modelo de suscripción mensual. Al seleccionar un plan,
          autoriza a LABLLD a cobrar el monto correspondiente de forma recurrente mediante
          Wompi. Los precios están denominados en pesos colombianos (COP) o dólares
          estadounidenses (USD) según se indique en la plataforma. Las suscripciones se
          renuevan automáticamente hasta que sean canceladas.
        </p>
        <p>
          El costo de cada pedido (productos + envío) se cobra al merchant en el momento
          en que este acepta la cotización. No se realizan reembolsos por pedidos ya
          procesados en producción.
        </p>

        <h2>4. Integración con Shopify</h2>
        <p>
          Al conectar su tienda Shopify a LABLLD, usted otorga a la plataforma los permisos
          necesarios para leer y gestionar productos, pedidos y fulfillments según los scopes
          autorizados. Usted es responsable de cumplir con los Términos de Servicio de Shopify
          y de garantizar que el uso del Servicio no infrinja dichos términos.
        </p>

        <h2>5. Etiquetas y propiedad intelectual</h2>
        <p>
          Al subir etiquetas o materiales de marca a la plataforma, usted declara y garantiza
          que posee o tiene licencia sobre todos los derechos de propiedad intelectual de
          dichos materiales. LABLLD no reivindica propiedad sobre su marca o diseños, pero
          usted otorga a LABLLD una licencia limitada para usar dichos materiales únicamente
          con el fin de prestar el Servicio.
        </p>

        <h2>6. Uso aceptable</h2>
        <p>Usted se compromete a no usar el Servicio para:</p>
        <ul>
          <li>Vender productos ilegales o no autorizados.</li>
          <li>Infringir derechos de terceros (marcas, patentes, derechos de autor).</li>
          <li>Realizar actividades fraudulentas o engañosas.</li>
          <li>Interferir con el funcionamiento del Servicio o sus infraestructuras.</li>
          <li>Revender o sublicenciar el acceso al Servicio sin autorización expresa.</li>
        </ul>

        <h2>7. Suspensión y terminación</h2>
        <p>
          LABLLD se reserva el derecho de suspender o terminar su cuenta si viola estos
          Términos, si su suscripción queda impaga, o si detectamos actividad fraudulenta
          o dañina. Usted puede cancelar su suscripción en cualquier momento desde la
          sección de Facturación en su cuenta. La cancelación será efectiva al final del
          período de facturación en curso.
        </p>

        <h2>8. Limitación de responsabilidad</h2>
        <p>
          En la máxima medida permitida por la ley, LABLLD no será responsable por daños
          indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo pérdida
          de ingresos, pérdida de datos o interrupción del negocio, derivados del uso o la
          imposibilidad de usar el Servicio, incluso si LABLLD fue advertido de la posibilidad
          de dichos daños.
        </p>
        <p>
          La responsabilidad total de LABLLD frente a usted por cualquier reclamo no superará
          el monto pagado por usted durante los 3 meses anteriores al evento que dio origen
          al reclamo.
        </p>

        <h2>9. Indemnización</h2>
        <p>
          Usted acepta indemnizar, defender y mantener indemne a LABLLD y sus empleados,
          directivos y agentes frente a cualquier reclamo, pérdida, daño, responsabilidad
          y costo (incluidos honorarios legales) derivados de: (a) su uso del Servicio,
          (b) la violación de estos Términos, o (c) la infracción de derechos de terceros.
        </p>

        <h2>10. Modificaciones</h2>
        <p>
          LABLLD puede modificar estos Términos en cualquier momento. Le notificaremos
          los cambios materiales con al menos 15 días de anticipación por correo electrónico.
          El uso continuado del Servicio tras la fecha de vigencia de los cambios constituye
          su aceptación de los nuevos Términos.
        </p>

        <h2>11. Ley aplicable</h2>
        <p>
          Estos Términos se rigen por las leyes de la República de Colombia. Cualquier
          controversia será sometida a los tribunales competentes de Bogotá, Colombia.
        </p>

        <h2>12. Contacto</h2>
        <p>
          Para preguntas sobre estos Términos, contáctenos en:<br />
          <strong>LABLLD</strong><br />
          Correo: <strong>soporte@lablld.com</strong>
        </p>
      </div>
    </div>
  )
}
