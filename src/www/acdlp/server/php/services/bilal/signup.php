<!DOCTYPE html>
<html lang="fr">

    <?php include 'services/bilal/head.php'; ?>

<body>
    <div class="form-container">
        <form action="server/php/services/bilal/bilal.php" method="post">

            <div class="input-group">
                <i class="fas fa-users"></i>
                <label for="association">Nom de votre association :</label>
                <input type="text" id="association" name="association" required>
            </div>

            <div class="input-group">
                <i class="fas fa-envelope"></i>
                <label for="email">Email :</label>
                <input type="email" id="email" name="email" required>
            </div>

            <div class="input-group">
                <i class="fas fa-phone"></i>
                <label for="telephone">Téléphone :</label>
                <input type="tel" id="telephone" name="telephone" pattern="[0-9]{10}" required>
            </div>

            <div class="input-group">
                <i class="fas fa-map-marker-alt"></i>
                <label for="zone">Zone d'intervention :</label>
                <select id="zone" name="zone[]" multiple="multiple">
                    <option value="Paris">Paris</option>
                    <option value="Lyon">Lyon</option>
                    <option value="Marseille">Marseille</option>
                    <!-- ... autres villes ... -->
                </select>
            </div>

            <div class="input-group">
                <i class="fas fa-lock"></i>
                <label for="password">Mot de passe :</label>
                <input type="password" id="password" name="password" required>
            </div>

            <input type="submit" value="S'inscrire">
        </form>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script>
        $(document).ready(function() {
            $('#zone').select2();
        });
    </script>
</body>