import random
from typing import List, Dict, Optional
from uuid import UUID

class CasinoEngine:
    """
    Servicio central para la lógica de juegos de azar y premios.
    Sigue la lógica de 'Weighted Random Selection'.
    """

    @staticmethod
    def resolve_bet(prizes: List[Dict]) -> Optional[Dict]:
        """
        Resuelve una apuesta basada en una lista de premios con probabilidades.
        Cada premio en 'prizes' debe tener una clave 'probability' (float entre 0 y 1).
        """
        if not prizes:
            return None

        # Ordenar premios para asegurar consistencia
        sorted_prizes = sorted(prizes, key=lambda x: x.get('id', ''))
        
        # Generar número aleatorio
        r = random.random()
        cumulative_probability = 0.0

        for prize in sorted_prizes:
            cumulative_probability += prize.get('probability', 0.0)
            if r <= cumulative_probability:
                return prize

        return None  # No ganó nada

    @staticmethod
    def calculate_house_edge(prizes: List[Dict]) -> float:
        """
        Calcula el margen de la casa basado en las probabilidades sumadas.
        """
        total_prob = sum(p.get('probability', 0.0) for p in prizes)
        return max(0.0, 1.0 - total_prob)

# Singleton instance
casino_engine = CasinoEngine()
