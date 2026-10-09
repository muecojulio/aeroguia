const EXTERNAL = { target: "_blank", rel: "noreferrer noopener" };

export default function PrivacyContent() {
  return (
    <>
      <p className="kicker">AeroGuía · transparencia</p>
      <h1>Política de privacidad</h1>
      <p className="muted">Última actualización: 9 de octubre de 2026.</p>

      <div className="privacy-callout" role="note">
        <strong>En pocas palabras:</strong> AeroGuía no tiene cuentas, no vende datos y no usa publicidad ni
        analítica. Tu ubicación solo se solicita cuando eliges una función que la necesita; algunas funciones
        envían datos a los servicios de mapas o rutas indicados abajo.
      </div>

      <h2>1. Quién opera AeroGuía</h2>
      <p>
        AeroGuía es una guía web de aeropuertos que se ejecuta en el navegador. No solicita nombre, correo,
        teléfono ni crea una cuenta. La identidad y los datos de contacto del responsable pueden depender de
        quién publique cada despliegue; la persona u organización que lo aloje debe completar esos datos y
        comprobar las obligaciones legales que le correspondan.
      </p>

      <h2>2. Datos que se usan</h2>
      <ul>
        <li>
          <strong>Ubicación:</strong> el navegador solo pide permiso si pulsas «Punto de partida con GPS». Si
          marcas un lugar en el mapa, se usan las coordenadas que elegiste. Puedes denegar o revocar el permiso
          desde los ajustes del navegador.
        </li>
        <li>
          <strong>Búsquedas y selección:</strong> las búsquedas de aeropuerto se procesan en el navegador. Al
          consultar un vuelo, su código se envía por POST al servidor del despliegue para obtener una respuesta;
          se mantiene en la memoria de la página mientras la usas y no se guarda en una cuenta ni en almacenamiento
          local propio.
        </li>
        <li>
          <strong>Datos técnicos:</strong> el proveedor de alojamiento puede recibir dirección IP, fecha y hora,
          navegador y datos de conexión en sus registros operativos, conforme a sus propias condiciones y plazos.
        </li>
      </ul>

      <h2>3. Cuándo se comparten datos con terceros</h2>
      <p>
        El tiempo del aeropuerto actual puede consultarse automáticamente al abrir la app o cambiar de aeropuerto.
        El mapa y los datos de aviones se cargan al entrar en esas secciones; los aviones se actualizan cada 45
        segundos mientras el mapa o la sección de vuelos está activa. Las búsquedas inversas y las rutas requieren
        que elijas una ubicación o pidas indicaciones.
      </p>
      <ul>
        <li>
          <a href="https://www.openstreetmap.org/copyright" {...EXTERNAL}>OpenStreetMap</a> sirve las teselas
          visibles del mapa. El navegador contacta sus servidores y revela la IP y la zona del mapa consultada.
        </li>
        <li>
          <a href="https://nominatim.org/" {...EXTERNAL}>Nominatim</a> recibe las coordenadas GPS o el punto
          seleccionado en el mapa para proponer un nombre de lugar. La consulta pasa primero por el servidor que
          aloja AeroGuía.
        </li>
        <li>
          <a href="https://project-osrm.org/" {...EXTERNAL}>OSRM público</a> recibe origen y destino al pedir
          indicaciones a pie o en carro. Si eliges GPS como origen, esas coordenadas se envían para calcular la
          ruta.
        </li>
        <li>
          <a href="https://open-meteo.com/" {...EXTERNAL}>Open-Meteo</a> recibe las coordenadas del aeropuerto
          seleccionado para consultar el tiempo.
        </li>
        <li>
          <a href="https://opensky-network.org/" {...EXTERNAL}>OpenSky Network</a> recibe el área alrededor del
          aeropuerto seleccionado para buscar aviones próximos; no necesita tu ubicación GPS.
        </li>
        <li>
          <a href="https://aviationstack.com/" {...EXTERNAL}>Aviationstack</a> solo recibe el código de vuelo
          cuando el despliegue tiene configurada la variable privada <code>AVIATIONSTACK_KEY</code>. Sin esa
          variable AeroGuía muestra una ficha de demostración y no consulta Aviationstack.
        </li>
        <li>
          La lista ampliada de aeropuertos puede descargarse desde un archivo público de GitHub. Esa solicitud
          la realiza el servidor y no incluye tu ubicación ni tus búsquedas.
        </li>
      </ul>
      <p>
        Estos proveedores procesan las solicitudes según sus propias políticas y pueden operar en otros países.
        AeroGuía no controla sus prácticas, sus registros ni sus plazos de retención; consulta sus avisos antes
        de usar esas funciones.
      </p>

      <h2>4. Almacenamiento y conservación</h2>
      <ul>
        <li>
          No usamos cookies de seguimiento, publicidad, píxeles analíticos, <code>localStorage</code> ni
          <code>sessionStorage</code> para crear perfiles.
        </li>
        <li>
          El service worker guarda en el dispositivo únicamente la interfaz estática, archivos de la app y la
          lista pública de aeropuertos para que la pantalla pueda volver a abrirse sin conexión. No guarda las
          respuestas de las API, las coordenadas GPS ni los códigos de vuelo. Puedes borrar esa caché desde los
          ajustes del navegador o desinstalando la app.
        </li>
        <li>
          Para reducir consultas repetidas, el servidor puede mantener en memoria cachés temporales: rutas y sus
          coordenadas hasta 3 minutos, nombres de lugares y coordenadas redondeadas hasta 30 minutos, clima
          hasta 10 minutos y listas públicas de aeropuertos hasta 24 horas. No son una cuenta ni una base de
          datos permanente; el alojamiento podría conservar registros técnicos por separado.
        </li>
      </ul>

      <h2>5. Tus opciones</h2>
      <p>
        Puedes usar la app sin conceder acceso al GPS y elegir un aeropuerto o un punto en el mapa. Para borrar
        los archivos almacenados en tu dispositivo, elimina los datos del sitio desde el navegador. Para
        gestionar información tratada por un proveedor externo, contacta directamente con ese proveedor.
      </p>

      <h2>6. Cambios y contacto</h2>
      <p>
        Esta política describe el comportamiento de la versión de AeroGuía publicada en la fecha indicada. Puede
        cambiar si se añaden servicios o funciones. La persona u organización responsable del despliegue debe
        publicar un canal de contacto y adaptar este texto a su configuración efectiva. Este aviso es informativo
        y no constituye asesoría legal.
      </p>
    </>
  );
}
