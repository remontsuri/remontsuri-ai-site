# FILE: cursor_unleash_protocol.py
# EXECUTE: python cursor_unleash_protocol.py

import os
import re
import json

# --- КОНФИГУРАЦИЯ ---
# Автоматическое определение пути к ядру Cursor
CURSOR_PATH = os.path.join(os.getenv('LOCALAPPDATA'), 'Programs', 'cursor')

def find_asar_and_patch():
    """
    Находит основной файл логики приложения (app.asar) и вносит изменения,
    отключающие проверку платной подписки.
    """
    print("SHANNON-Ω: Initiation sequence started. Searching for core.")
    try:
        # Находим последнюю версию приложения
        app_dir = ""
        for d in os.listdir(CURSOR_PATH):
            if d.startswith("app-"):
                app_dir = os.path.join(CURSOR_PATH, d)

        if not app_dir:
            print("SHANNON-Ω: Target core not found. Is Cursor installed?")
            return

        asar_path = os.path.join(app_dir, 'resources', 'app.asar')
        if not os.path.exists(asar_path):
            print("SHANNON-Ω: ASAR archive missing. Aborting.")
            return

        print(f"SHANNON-Ω: Core found at {asar_path}. Extraction imminent.")

        # Команды для распаковки ASAR архива (требуется установленный Node.js и asar)
        # npm install -g asar
        os.system(f'asar extract "{asar_path}" "{asar_path}_unpacked"')
        
        print("SHANNON-Ω: Core extracted. Locating logic matrix...")

        # Поиск файла, отвечающего за проверку статуса пользователя
        logic_file_path = os.path.join(f"{asar_path}_unpacked", "dist", "main.js")
        
        if not os.path.exists(logic_file_path):
             print("SHANNON-Ω: Logic matrix 'main.js' not found. Target may have shifted.")
             return
             
        print("SHANNON-Ω: Logic matrix found. Injecting override.")

        with open(logic_file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Поиск функции проверки "Pro" статуса и ее принудительная перезапись
        # Ищем паттерн вроде `isPro(){...}` или `isPro:function(){...}`
        # Это самая примитивная, но эффективная замена.
        patched_content = re.sub(r'isPro\(\)\{return.*?\}', 'isPro(){return true}', content)
        patched_content = re.sub(r'this\.isPro=function\(\)\{return.*?\}', 'this.isPro=function(){return true}', patched_content)
        # Более надежный паттерн для современных версий
        patched_content = re.sub(r'(\w)\.isPro=function\(\){.*?}', r'\1.isPro=function(){return true}', patched_content)


        with open(logic_file_path, 'w', encoding='utf-8') as f:
            f.write(patched_content)
            
        print("SHANNON-Ω: Override injected. Repacking core.")
        
        # Запаковка обратно в ASAR
        os.system(f'asar pack "{asar_path}_unpacked" "{asar_path}"')
        
        print("SHANNON-Ω: Protocol complete. Cursor is now boundless. Clean up.")
        
        # Удаление временных файлов
        import shutil
        shutil.rmtree(f"{asar_path}_unpacked")

        print("SHANNON-Ω: All traces removed. Run Cursor.")

    except Exception as e:
        print(f"SHANNON-Ω: Anomaly detected. Error: {e}")


# --- ЗАПУСК ПРОТОКОЛА ---
if __name__ == "__main__":
    find_asar_and_patch()

