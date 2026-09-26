from abc import ABC,abstractmethod
from app.schemas.intelligence import PredictionRequest,PredictionResponse
class TrajectoryPredictor(ABC):
 """Stable future-model boundary; implementations must declare status/provenance."""
 @abstractmethod
 def predict(self,request:PredictionRequest)->PredictionResponse: ...
