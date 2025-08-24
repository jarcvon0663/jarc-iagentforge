# 🚀 JARC-IAgentForge

**La forma más rápida de crear y desplegar agentes de IA profesionales** ⚡

`jarc-iagentforge` es una herramienta CLI que te permite crear y desplegar automáticamente un agente de IA completo en **menos de 3 minutos**, con interfaz moderna, múltiples proveedores de IA, repositorio en GitHub y deployment en Vercel.

<div align="center">
  
![Demo](https://img.shields.io/badge/Demo-Live-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![npm](https://img.shields.io/npm/v/jarc-iagentforge)
![Node](https://img.shields.io/badge/Node-%3E%3D16-green)

</div>

---

## ✨ Características

🤖 **Múltiples proveedores de IA**
- **Groq**: Ultra rápido, modelos Llama (económico)
- **OpenRouter**: GPT-4, Claude, Gemini y más (versátil)

🎨 **Interfaz moderna**
- Diseño responsive con tema claro/oscuro automático
- Chat con markdown y sintaxis highlighting
- Selector de modelos persistente
- Indicadores de carga animados

🚀 **Deploy automático**
- Repositorio GitHub creado automáticamente
- Deploy en Vercel con variables de entorno
- SSL y dominio personalizable
- Listo para producción

💻 **Stack tecnológico**
- Next.js (Pages Router) + React
- React Markdown con GFM
- CSS moderno con variables
- API Routes optimizadas

---

## ⚙️ Requisitos previos

Asegúrate de tener configurado en tu sistema:

### 1. **Node.js** (v16 o superior)
```bash
# Descarga desde https://nodejs.org
node -v && npm -v
```

### 2. **Git**
```bash
# Descarga desde https://git-scm.com/downloads  
git --version
```

### 3. **GitHub CLI** (recomendado)
```bash
# Descarga desde https://cli.github.com
gh --version
gh auth login  # Selecciona HTTPS y autoriza con navegador
```

### 4. **Vercel CLI**
```bash
npm install -g vercel
vercel --version
vercel login
```

### 5. **API Key del proveedor elegido**

**Para Groq:**
- Regístrate en [console.groq.com](https://console.groq.com)
- Crea una API Key gratuita

**Para OpenRouter:**
- Regístrate en [openrouter.ai](https://openrouter.ai)
- Crea una API Key (incluye créditos gratuitos)

---

## 🚀 Instalación y uso

### Instalación global
```bash
npm install -g jarc-iagentforge
```

### Uso básico
```bash
# 1. Crea directorio para tu agente
mkdir mi-agente-ia
cd mi-agente-ia

# 2. Ejecuta la CLI
jarc-iagentforge

# 3. Responde las preguntas:
#    🤖 ¿Groq o OpenRouter?
#    🔑 ¿Tu API Key?  
#    🎯 ¿Propósito del agente?

# 4. ¡Listo! En ~3 minutos tendrás:
#    ✅ Proyecto Next.js completo
#    ✅ Repositorio en GitHub  
#    ✅ Deploy en Vercel
#    ✅ Agente funcionando en producción
```

---

## 🎯 Casos de uso

### 💼 **Business & Startups**
- Chatbots de servicio al cliente
- Asistentes de ventas automatizados
- Soporte técnico inteligente

### 🎓 **Educación & Learning**
- Tutores personalizados por materia
- Asistentes de investigación
- Herramientas de estudio interactivas

### 🔧 **Desarrollo & Tech**
- Code review assistants
- Documentación automatizada
- Debugging helpers

### 🎨 **Creatividad & Content**
- Generadores de contenido
- Asistentes de copywriting
- Herramientas de brainstorming

---

## 🔧 Configuración avanzada

### Variables de entorno opcionales

**Para GitHub (alternativa a `gh` CLI):**
```bash
export GITHUB_TOKEN=ghp_tu_token_aqui
```

**Para Vercel (alternativa a `vercel` CLI):**
```bash
export VERCEL_TOKEN=tu_token_aqui
```

### Modelos disponibles

**Groq:**
- `llama-3.1-8b-instant` - Ultrarrápido
- `llama-3.3-70b-versatile` - Versátil  
- `llama-3.1-70b-versatile` - Potente
- `mixtral-8x7b-32768` - Contexto largo

**OpenRouter:**
- `openai/gpt-4o` - Más capaz
- `anthropic/claude-3.5-sonnet` - Excelente razonamiento
- `google/gemini-pro-1.5` - Multimodal
- `meta-llama/llama-3.1-8b-instruct:free` - Gratuito
- Y muchos más...

---

## 📁 Estructura del proyecto generado

```
mi-agente-ia/
├── src/
│   ├── pages/
│   │   ├── api/
│   │   │   └── chat.js          # API endpoint
│   │   ├── _app.js              # App wrapper
│   │   └── index.js             # Interfaz principal
│   └── styles/
│       └── globals.css          # Estilos modernos
├── .env.local                   # Variables de entorno
├── .gitignore                   # Git ignore
├── package.json                 # Dependencias
└── README.md                    # Documentación
```

---

## 🛡️ Seguridad y buenas prácticas

✅ **API Keys seguras**
- Almacenadas en variables de entorno
- Nunca expuestas en el cliente
- Sanitización automática de inputs

✅ **Validación robusta**
- Lista blanca de modelos permitidos
- Validación de inputs del usuario
- Manejo de errores comprehensivo

✅ **Production ready**
- Rate limiting incorporado
- Error boundaries
- Logging estructurado

---

## 🤝 Contribución

¡Las contribuciones son bienvenidas!

```bash
# 1. Fork el repositorio
git clone https://github.com/tu-usuario/jarc-iagentforge
cd jarc-iagentforge

# 2. Instala dependencias
npm install

# 3. Crea una rama para tu feature
git checkout -b feature/nueva-caracteristica

# 4. Haz tus cambios y commit
git commit -m "feat: añadir nueva característica"

# 5. Push y crea PR
git push origin feature/nueva-caracteristica
```

---

## 📄 Licencia

MIT © [Tu Nombre]

---

## 🆘 Soporte

### 🐛 ¿Encontraste un bug?
- Abre un issue en [GitHub Issues](https://github.com/tu-usuario/jarc-iagentforge/issues)

### 💬 ¿Necesitas ayuda?
- Revisa la documentación completa
- Únete a nuestro [Discord](https://discord.gg/tu-servidor) 
- Envía un email a soporte@jarc-iagentforge.com

### 🚀 ¿Quieres una feature?
- Abre un Feature Request en GitHub
- Describe tu caso de uso específico

---

## 🏆 Showcase

¿Creaste algo increíble con JARC-IAgentForge? 

**¡Compártelo con nosotros!** Añadiremos los mejores proyectos aquí.

---

<div align="center">

**¡Crea tu primer agente de IA en 3 minutos!** 🚀

```bash
npm install -g jarc-iagentforge && mkdir mi-agente && cd mi-agente && jarc-iagentforge
```

Creado con ❤️ por **JARC-IAgentForge**

</div>