import time
import json
import shutil
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# URL de la página de horarios
URL = "https://www.fciencias.unam.mx/docencia/horarios/indiceplan/20261/1556"

# Detecta la ruta de Chromium automáticamente
chromium_path = shutil.which("chromium") or shutil.which("chromium-browser")
if not chromium_path:
    print("No se encontró Chromium. Instálalo con 'sudo apt install chromium' o 'sudo apt install chromium-browser'.")
    exit(1)

# Configuración de opciones para Chromium en WSL (headless)
chrome_options = Options()
chrome_options.binary_location = chromium_path
# chrome_options.add_argument("--headless=new")  # Comentado para ver la ventana
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")

# Inicializa el driver de Selenium
try:
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
except Exception as e:
    print(f"Error al iniciar el navegador: {e}")
    exit(1)

driver.get(URL)
wait = WebDriverWait(driver, 10)

horarios = {}

# Espera a que los paneles estén presentes
wait.until(EC.presence_of_element_located((By.CLASS_NAME, "v-expansion-panel")))
paneles = driver.find_elements(By.CLASS_NAME, "v-expansion-panel")
print(f"[DEPURACIÓN] Total de paneles de semestre encontrados: {len(paneles)}")

for panel in paneles:
    try:
        nombre_semestre = panel.find_element(By.CLASS_NAME, "v-expansion-panel-title").text
        print(f"[DEPURACIÓN] Semestre: {nombre_semestre}")
    except Exception as e:
        print(f"No se pudo extraer el nombre del semestre: {e}")
        nombre_semestre = ""
    if not nombre_semestre:
        continue
    if nombre_semestre not in horarios:
        horarios[nombre_semestre] = {}
    try:
        materias = panel.find_elements(By.CLASS_NAME, "grupoplan_a")
        print(f"[DEPURACIÓN] Total de materias encontradas en '{nombre_semestre}': {len(materias)}")
        for idx, materia in enumerate(materias):
            nombre_materia = materia.text
            href_materia = materia.get_attribute("href")
            print(f"[EXTRAÍDO] Semestre: {nombre_semestre} | Materia: {nombre_materia} | Link: {href_materia}")
            if nombre_materia not in horarios[nombre_semestre]:
                horarios[nombre_semestre][nombre_materia] = {}
            # Abre el link de la materia en la misma ventana
            driver.execute_script("window.open(arguments[0], '_self')", href_materia)
            try:
                wait.until(EC.presence_of_element_located((By.CLASS_NAME, "v-expansion-panel")))
                time.sleep(1)
                grupos = driver.find_elements(By.CLASS_NAME, "v-expansion-panel")
                print(f"[DEPURACIÓN] Total de grupos encontrados en '{nombre_materia}': {len(grupos)}")
                for grupo_panel in grupos:
                    try:
                        # Extrae número de grupo
                        grupo_title = grupo_panel.find_element(By.CLASS_NAME, "v-expansion-panel-title").text
                        # Ejemplo: 'Grupo 4000   65 lugares   Modalidad presencial'
                        spans = grupo_panel.find_elements(By.TAG_NAME, "span")
                        grupo_num = ""
                        lugares = ""
                        modalidad = None
                        horario = None
                        dias = []
                        for s in spans:
                            txt = s.text.strip()
                            if txt.startswith("Grupo"):
                                grupo_num = txt.replace("Grupo", "").strip()
                            elif "lugares" in txt:
                                lugares = txt
                            elif "Modalidad" in txt:
                                modalidad = txt.replace("Modalidad", "").strip().capitalize()
                        # Modalidad también puede estar en un div.v-chip__content
                        try:
                            modalidad_chip = grupo_panel.find_element(By.CLASS_NAME, "v-chip__content").text
                            if modalidad_chip:
                                modalidad = modalidad_chip.replace("Modalidad", "").strip().capitalize()
                        except Exception:
                            pass
                        # Horario
                        try:
                            horario_div = grupo_panel.find_element(
                                By.CSS_SELECTOR,
                                ".v-col-sm-5.v-col-md-3.v-col-lg-4.v-col-auto.my-1.py-0 .v-chip__content"
                            )
                            horario = horario_div.text.strip()
                        except Exception:
                            pass
                        # Días
                        try:
                            dias_div = grupo_panel.find_elements(By.CSS_SELECTOR, ".v-col-sm-12.v-col-md-5.v-col-lg-4.v-col-auto.my-1.py-0")
                            for avatar in dias_div:
                                classes = avatar.get_attribute("class")
                                if "bg-blue-lighten-2" in classes:
                                    dia = avatar.text.strip()
                                    if dia:
                                        dias.append(dia)
                        except Exception:
                            pass
                        # Salón y nota (si existen)
                        salon = None
                        nota = None
                        try:
                            salon_div = grupo_panel.find_element(By.XPATH, ".//*[contains(text(),'Yelizcalli') or contains(text(),'O134') or contains(text(),'salón') or contains(text(),'Salón')]")
                            salon = salon_div.text
                        except Exception:
                            pass
                        # Nota (si existe)
                        try:
                            nota_div = grupo_panel.find_element(By.XPATH, ".//*[contains(text(),'Nota') or contains(text(),'nota')]")
                            nota = nota_div.text
                        except Exception:
                            pass
                        # Profesor y ayudantes: bloques v-row.my-1
                        rows_my1 = grupo_panel.find_elements(By.CSS_SELECTOR, "div.v-row.my-1")
                        # --- PROFESOR ---
                        profesor = None
                        profesor_horarios = []
                        if rows_my1:
                            prof_row = rows_my1[0]
                            # Nombre del profesor
                            try:
                                nombre_div = prof_row.find_element(By.CSS_SELECTOR, ".v-col-sm-4.v-col-md-4.v-col-lg-4.v-col-12")
                                prof_a = nombre_div.find_element(By.CSS_SELECTOR, "a.profesor_a")
                                profesor = prof_a.text.strip()
                            except Exception:
                                profesor = None
                            # Horario
                            horario = None
                            try:
                                horario_div = prof_row.find_element(By.CSS_SELECTOR, ".v-col-sm-5.v-col-md-3.v-col-lg-4.v-col-auto.my-1.py-0 .v-chip__content")
                                horario = horario_div.text.strip()
                            except Exception:
                                horario = None
                            # Días
                            dias = []
                            try:
                                dias_div = prof_row.find_element(By.CSS_SELECTOR, ".v-col-sm-12.v-col-md-5.v-col-lg-4.v-col-auto.my-1.py-0")
                                for avatar in dias_div.find_elements(By.CLASS_NAME, "v-avatar"):
                                    classes = avatar.get_attribute("class")
                                    if "bg-blue-lighten-2" in classes:
                                        dia = avatar.text.strip()
                                        if dia:
                                         dias.append(dia)
                            except Exception:
                                pass
                            if horario and dias:
                                profesor_horarios.append({
                                    "horario": horario,
                                    "dias": dias
                                })
                        # --- AYUDANTES ---
                        ayudantes = []
                        if rows_my1 and len(rows_my1) > 1:
                            for ayud_row in rows_my1[1:]:
                                # Nombre del ayudante
                                nombre_ayud = None
                                try:
                                    nombre_div = ayud_row.find_element(By.CSS_SELECTOR, ".v-col-sm-4.v-col-md-4.v-col-lg-4.v-col-12")
                                    ayud_a = nombre_div.find_element(By.CSS_SELECTOR, "a.profesor_a")
                                    nombre_ayud = ayud_a.text.strip()
                                except Exception:
                                    nombre_ayud = None
                                # Horario
                                ayud_horario = None
                                try:
                                    horario_div = ayud_row.find_element(By.CSS_SELECTOR, ".v-col-sm-5.v-col-md-3.v-col-lg-4.v-col-auto.my-1.py-0 .v-chip__content")
                                    ayud_horario = horario_div.text.strip()
                                except Exception:
                                    ayud_horario = None
                                # Días
                                ayud_dias = []
                                try:
                                    dias_div = ayud_row.find_element(By.CSS_SELECTOR, ".v-col-sm-12.v-col-md-5.v-col-lg-4.v-col-auto.my-1.py-0")
                                    for avatar in dias_div.find_elements(By.CLASS_NAME, "v-avatar"):
                                        classes = avatar.get_attribute("class")
                                        if "bg-blue-lighten-2" in classes:
                                            dia = avatar.text.strip()
                                            if dia:
                                                ayud_dias.append(dia)
                                except Exception:
                                    pass
                                if ayud_horario and ayud_dias:
                                    ayudantes.append({
                                        "nombre": nombre_ayud,
                                        "horario": ayud_horario,
                                        "dias": ayud_dias
                                    })
                        # Estructura final
                        grupo_dict = {
                            "grupo": grupo_num,
                            "profesor": {
                                "nombre": profesor,
                                "horarios": profesor_horarios
                            },
                        }
                        if ayudantes:
                            grupo_dict["ayudantes"] = ayudantes
                        grupo_dict["nota"] = nota
                        grupo_dict["salon"] = salon
                        grupo_dict["modalidad"] = modalidad
                        print(f"[EXTRAÍDO] Grupo: {grupo_num} | Profesor: {profesor} | Modalidad: {modalidad}")
                        horarios[nombre_semestre][nombre_materia][grupo_num] = grupo_dict
                    except Exception as e:
                        print(f"No se pudo extraer grupo en '{nombre_materia}': {e}")
            except Exception as e:
                print(f"No se pudieron extraer grupos para la materia '{nombre_materia}': {e}")
            # Regresa a la lista de materias
            driver.back()
            wait.until(EC.presence_of_element_located((By.CLASS_NAME, "v-expansion-panel")))
            time.sleep(1)
    except Exception as e:
        print(f"No se pudieron extraer materias para el semestre '{nombre_semestre}': {e}")

# Guarda los datos en JSON en /src/data/
os.makedirs("./src/data", exist_ok=True)
with open("./src/data/horario_2026-1.json", "w", encoding="utf-8") as f:
    json.dump(horarios, f, ensure_ascii=False, indent=2)

driver.quit()
print("¡Scraping completo!")