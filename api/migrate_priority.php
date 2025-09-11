<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require 'db.php';

// --- CONFIGURACIÓN ---
// ID del campo personalizado "Prioridad" ya insertado.
$priorityFieldId = 'field_68c2ed2eaaa94';

if ($priorityFieldId === 'REEMPLAZA_ESTE_VALOR_CON_EL_ID_REAL') {
    die("<h1>Error: Debes configurar la variable \$priorityFieldId en el script.</h1>");
}

echo "<h1>Iniciando migración de prioridades...</h1>";
echo "<p>Usando el Field ID: <strong>" . htmlspecialchars($priorityFieldId) . "</strong></p>";

try {
    // 1. Obtener todas las opciones de prioridad del nuevo sistema y mapearlas
    $stmt_options = $conn->prepare("SELECT id, value FROM custom_field_options WHERE fieldId = ?");
    $stmt_options->bind_param("s", $priorityFieldId);
    $stmt_options->execute();
    $options_result = $stmt_options->get_result();
    
    $optionsMap = [];
    while ($row = $options_result->fetch_assoc()) {
        // Creamos un mapa como: 'normal' => 'opt_abc123' (en minúsculas para evitar errores)
        $optionsMap[trim(strtolower($row['value']))] = $row['id'];
    }
    $stmt_options->close();

    if (empty($optionsMap)) {
        die("<h2>No se encontraron opciones para el campo de Prioridad. Asegúrate de haberlas creado en el panel de admin y que el Field ID sea correcto.</h2>");
    }
    echo "<p>Opciones de prioridad encontradas y mapeadas: " . implode(', ', array_keys($optionsMap)) . "</p>";

    // 2. Obtener todas las tareas con la prioridad antigua
    $tasks_result = $conn->query("SELECT id, priority FROM tasks WHERE priority IS NOT NULL AND priority != ''");
    $tasks = $tasks_result->fetch_all(MYSQLI_ASSOC);
    echo "<p>Se encontraron " . count($tasks) . " tareas con prioridades antiguas para migrar.</p><hr>";
    
    // 3. Iniciar transacción e insertar los nuevos valores
    $conn->begin_transaction();
    $stmt_upsert = $conn->prepare(
        "INSERT INTO task_custom_field_values (id, taskId, fieldId, optionId) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE optionId = VALUES(optionId)"
    );

    $migrated_count = 0;
    $unmapped_count = 0;
    foreach ($tasks as $task) {
        $old_priority_text = trim(strtolower($task['priority']));
        
        // Si el texto de la prioridad antigua existe en nuestro mapa de nuevas opciones
        if (isset($optionsMap[$old_priority_text])) {
            $new_option_id = $optionsMap[$old_priority_text];
            $value_id = uniqid('cfv_');
            
            $stmt_upsert->bind_param("ssss", $value_id, $task['id'], $priorityFieldId, $new_option_id);
            $stmt_upsert->execute();
            $migrated_count++;
            echo "Tarea " . htmlspecialchars($task['id']) . " migrada de '" . htmlspecialchars($task['priority']) . "' a la opción " . htmlspecialchars($new_option_id) . "<br>";
        } else {
            $unmapped_count++;
            echo "<span style='color: orange;'>Advertencia: La prioridad antigua '" . htmlspecialchars($task['priority']) . "' de la tarea " . htmlspecialchars($task['id']) . " no se encontró en las nuevas opciones.</span><br>";
        }
    }
    $stmt_upsert->close();
    
    // 4. Confirmar los cambios
    $conn->commit();
    echo "<hr><h2>¡Éxito! Se migraron " . $migrated_count . " prioridades de tareas.</h2>";
    if ($unmapped_count > 0) {
        echo "<h3>Se omitieron " . $unmapped_count . " tareas porque sus prioridades antiguas no coincidían con ninguna opción nueva.</h3>";
    }
    echo "<p>El proceso ha finalizado. Ahora debes actualizar el código del frontend.</p>";

} catch (Exception $e) {
    if ($conn->ping()) { $conn->rollback(); }
    die("<h1>Error durante la migración: " . $e->getMessage() . "</h1>");
}

$conn->close();
?>