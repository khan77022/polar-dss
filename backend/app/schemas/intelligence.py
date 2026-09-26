from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from app.schemas.iceberg import Provenance
class Feature(BaseModel): name:str;value:float|str|None=None;availability:str;note:str
class BehaviorResponse(BaseModel): icebergId:str;profileVersion:str;method:str;behaviorClass:str;features:list[Feature];limitations:str;provenance:Provenance
class ModelMetadataResponse(BaseModel): modelName:str;modelVersion:str;interfaceType:str;inputContract:dict;outputContract:dict;limitations:str;provenance:Provenance
class PredictionRequest(BaseModel): icebergId:str;horizonHours:int
class PredictionResponse(BaseModel): status:str;model:ModelMetadataResponse|None=None;uncertainty:str;limitations:str
class InteractionResponse(BaseModel): id:UUID;icebergAId:str;icebergBId:str;status:str;analysisAt:datetime;closestApproachKm:float|None=None;relativeVelocityKts:float|None=None;relativeHeadingDeg:float|None=None;interactionScore:float|None=None;method:str;limitations:str;provenance:Provenance
class InteractionPage(BaseModel):items:list[InteractionResponse];limit:int;offset:int;total:int
